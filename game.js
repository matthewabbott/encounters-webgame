import { EncounterTypes, Difficulty } from './encounters.js';
import { UI } from './ui.js';
import { ResourceChargeType, StarterRigs } from './rigs.js';
import { CommandMode, BaseCommands, getRandomCommand } from './commands.js';

/**
 * Card class representing a playing card
 */
class Card {
    constructor(rank, suit, border = null) {
        this.rank = rank;
        this.suit = suit;
        this.border = border; // null (neutral), 'red' (aggressive), 'blue' (passive)
        this.id = `${rank}-${suit}-${Date.now()}-${Math.random()}`;
    }

    get value() {
        const rankValues = {
            'A': 1, '2': 2, '3': 3, '4': 4, '5': 5,
            '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
            'J': 11, 'Q': 12, 'K': 13
        };
        return rankValues[this.rank];
    }

    set value(newValue) {
        // Allow commands to modify card values
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        const clampedValue = Math.max(1, Math.min(13, newValue));
        this.rank = ranks[clampedValue - 1];
    }

    get color() {
        return (this.suit === '♥' || this.suit === '♦') ? 'red' : 'black';
    }

    toString() {
        return `${this.rank}${this.suit}`;
    }
}

/**
 * Deck class managing the shared card deck
 */
class Deck {
    constructor() {
        this.cards = [];
        this.initializeDeck();
    }

    initializeDeck() {
        const suits = ['♠', '♥', '♣', '♦'];
        // MVP: Start with just 12 cards (A-3 of each suit)
        const ranks = ['A', '2', '3'];

        this.cards = [];
        for (let suit of suits) {
            for (let rank of ranks) {
                this.cards.push(new Card(rank, suit));
            }
        }

        this.shuffle();
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    draw(count = 1) {
        const drawn = [];
        for (let i = 0; i < count && this.cards.length > 0; i++) {
            drawn.push(this.cards.pop());
        }
        return drawn;
    }

    returnCards(cards) {
        this.cards.push(...cards);
        this.shuffle();
    }

    get size() {
        return this.cards.length;
    }

    getContents() {
        return this.cards.map(c => c.toString());
    }

    createCard(rank, suit, border = null) {
        // Helper method for commands to create new cards
        return new Card(rank, suit, border);
    }

    drawCard() {
        // Draw a single card
        return this.cards.pop();
    }
}

/**
 * Encounter class representing a single encounter
 */
class Encounter {
    constructor(id, type, slotId = null) {
        this.id = id;
        this.type = type;
        this.hand = [];
        this.playedCards = [];
        this.completed = false;
        this.failed = false;
        this.rewardsCollected = false;
        this.minimized = true; // Start minimized, player can expand to interact
        this.slotId = slotId; // Which map slot this encounter is in

        // Trick-taking specific properties
        this.opponentHand = []; // Opponent's cards (for trick-taking)
        this.currentTrick = []; // Cards played in current trick [{ player: 'player'|'opponent', card }]
        this.tricksWon = 0; // Tracks won by player
        this.opponentTricksWon = 0; // Tricks won by opponent
        this.completedTricks = []; // History of completed tricks

        // Initialize opponent hand if this is a trick-taking encounter
        if (type.initOpponentHand) {
            const opponentCardData = type.initOpponentHand();
            this.opponentHand = opponentCardData.map(data => new Card(data.rank, data.suit, data.border));
        }
    }

    addCardToHand(card) {
        this.hand.push(card);
    }

    playCard(cardId) {
        const cardIndex = this.hand.findIndex(c => c.id === cardId);
        if (cardIndex === -1) return null;

        const card = this.hand.splice(cardIndex, 1)[0];
        this.playedCards.push(card);
        return card;
    }

    getAllCards() {
        return [...this.hand, ...this.playedCards];
    }

    checkWinCondition() {
        return this.type.checkWin(this);
    }

    checkFailCondition() {
        return this.type.checkFail(this);
    }

    getProgress() {
        return this.type.getProgress(this);
    }

    // Trick-taking methods
    playTrickCard(cardId) {
        // Player plays a card for the current trick
        const cardIndex = this.hand.findIndex(c => c.id === cardId);
        if (cardIndex === -1) return null;

        const card = this.hand.splice(cardIndex, 1)[0];
        this.currentTrick.push({ player: 'player', card });

        // After player plays, opponent plays (if opponent has cards)
        if (this.opponentHand.length > 0) {
            this.opponentPlayCard();
        }

        // Resolve trick if both players have played
        if (this.currentTrick.length === 2) {
            this.resolveTrick();
        }

        return card;
    }

    opponentPlayCard() {
        // AI chooses which card to play based on border behavior
        const playerCard = this.currentTrick.find(t => t.player === 'player')?.card;
        let chosenCardIndex = -1;

        // Find cards that would win the trick
        const winningIndices = this.opponentHand
            .map((card, index) => ({ card, index }))
            .filter(({ card }) => playerCard && card.value > playerCard.value)
            .map(({ index }) => index);

        // Check for red border cards (aggressive - always try to win)
        const redBorderWinningIndex = this.opponentHand.findIndex((card, index) =>
            card.border === 'red' && winningIndices.includes(index)
        );

        if (redBorderWinningIndex !== -1) {
            // Play red border card that wins
            chosenCardIndex = redBorderWinningIndex;
        } else {
            // Check for blue border cards (passive - avoid winning)
            const nonWinningBlueIndex = this.opponentHand.findIndex((card, index) =>
                card.border === 'blue' && !winningIndices.includes(index)
            );

            if (nonWinningBlueIndex !== -1) {
                // Play blue card that doesn't win
                chosenCardIndex = nonWinningBlueIndex;
            } else {
                // Default: play leftmost card
                chosenCardIndex = 0;
            }
        }

        const card = this.opponentHand.splice(chosenCardIndex, 1)[0];
        this.currentTrick.push({ player: 'opponent', card });
        return card;
    }

    resolveTrick() {
        // Determine who won the trick (high card wins)
        const playerPlay = this.currentTrick.find(t => t.player === 'player');
        const opponentPlay = this.currentTrick.find(t => t.player === 'opponent');

        if (!playerPlay || !opponentPlay) return;

        const winner = playerPlay.card.value > opponentPlay.card.value ? 'player' : 'opponent';

        if (winner === 'player') {
            this.tricksWon++;
        } else {
            this.opponentTricksWon++;
        }

        // Store completed trick
        this.completedTricks.push({
            playerCard: playerPlay.card,
            opponentCard: opponentPlay.card,
            winner
        });

        // Clear current trick
        this.currentTrick = [];
    }
}

/**
 * Game class managing the overall game state
 */
class Game {
    constructor() {
        this.deck = new Deck();
        this.encounters = new Map();
        this.nextEncounterId = 1;
        this.maxEncounterSlots = 2; // MVP: Start with 2 slots

        // Run progression tracking
        this.encountersCleared = 0;
        this.encountersNeededForBoss = 6;
        this.bossDefeated = false;
        this.bossDeclineCount = 0; // Track how many times player declined boss
        this.maxBossDeclines = 2;

        // Encounter deck system
        this.encounterDeck = [];
        this.encounterHand = [];
        this.encounterHandSize = 3;
        this.initializeEncounterDeck();

        // Hardware/Resource system
        this.currentRig = StarterRigs.Analyst; // Start with Analyst rig
        this.runResources = new Map(); // For per-run and per-run-recharge resources
        this.encounterResources = new Map(); // For per-encounter resources (current encounter only)
        this.initializeResources();

        // Command system (exploits - consumables)
        this.commands = []; // Command inventory (max 5)
        this.maxCommands = 5;
        this.commandInUse = null; // Currently selected command awaiting card selection

        // Pre-generated encounter options (for preview) - DEPRECATED, will remove
        this.nextEncounterOptions = [];
        this.generateNextEncounterOptions();

        this.ui = new UI(this);

        // Update encounter hand UI after UI is created
        this.ui.updateEncounterHand();
    }

    initializeEncounterDeck() {
        // Build initial encounter deck
        // Start with a pool of non-boss encounters
        const normalEncounters = Object.keys(EncounterTypes)
            .filter(key => EncounterTypes[key].difficulty !== Difficulty.BOSS)
            .map(key => EncounterTypes[key]);

        // Add multiple copies of each encounter type for variety
        this.encounterDeck = [];
        normalEncounters.forEach(encounterType => {
            // Add 2 copies of each encounter type
            this.encounterDeck.push(encounterType);
            this.encounterDeck.push(encounterType);
        });

        // Shuffle the deck
        this.shuffleEncounterDeck();

        // Add boss at the bottom (will be drawn when deck is nearly empty)
        const bossEncounters = Object.keys(EncounterTypes)
            .filter(key => EncounterTypes[key].difficulty === Difficulty.BOSS)
            .map(key => EncounterTypes[key]);
        if (bossEncounters.length > 0) {
            const randomBoss = bossEncounters[Math.floor(Math.random() * bossEncounters.length)];
            this.encounterDeck.push(randomBoss);
        }

        // Don't auto-fill hand - player must draw manually
        // Draw initial cards (start with 0, player draws)
        if (this.ui) {
            this.ui.updateEncounterHand();
        }
    }

    shuffleEncounterDeck() {
        // Fisher-Yates shuffle
        for (let i = this.encounterDeck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.encounterDeck[i], this.encounterDeck[j]] = [this.encounterDeck[j], this.encounterDeck[i]];
        }
    }

    drawEncounterCard() {
        if (this.encounterDeck.length === 0) {
            return null;
        }
        return this.encounterDeck.shift(); // Draw from top of deck
    }

    fillEncounterHand() {
        // DEPRECATED - kept for compatibility
        // Fill hand up to hand size
        while (this.encounterHand.length < this.encounterHandSize && this.encounterDeck.length > 0) {
            const card = this.drawEncounterCard();
            if (card) {
                this.encounterHand.push(card);
            }
        }

        // Update UI
        if (this.ui) {
            this.ui.updateEncounterHand();
        }
    }

    drawEncounterCardToHand() {
        // Draw a single card from deck to hand (manual draw)
        if (this.encounterDeck.length === 0) {
            this.ui.showNotification('Empty Deck', 'No more encounter cards to draw!', '⚠️');
            return false;
        }

        if (this.encounterHand.length >= this.encounterHandSize) {
            this.ui.showNotification('Hand Full', 'Your hand is full! Place a card first.', '⚠️');
            return false;
        }

        const card = this.drawEncounterCard();
        if (card) {
            this.encounterHand.push(card);
            this.ui.updateEncounterHand();
            return true;
        }

        return false;
    }

    // === Resource Management ===

    initializeResources() {
        // Initialize resources based on current rig
        this.currentRig.hardware.forEach(hw => {
            if (hw.chargeType === ResourceChargeType.PER_ENCOUNTER) {
                // Don't track globally, will init on encounter start
            } else {
                // Per-run and per-run-recharge tracked globally
                this.runResources.set(hw.name, {
                    current: hw.charges,
                    max: hw.charges,
                    chargeType: hw.chargeType,
                    hardware: hw
                });
            }
        });
    }

    refreshEncounterResources(encounterId) {
        // Called when player enters/expands an encounter
        // Refresh per-encounter resources
        this.encounterResources.clear();

        this.currentRig.hardware.forEach(hw => {
            if (hw.chargeType === ResourceChargeType.PER_ENCOUNTER) {
                this.encounterResources.set(hw.name, {
                    current: hw.charges,
                    max: hw.charges,
                    hardware: hw
                });
            }
        });

        // Recharge per-run-recharge resources
        this.runResources.forEach((resource) => {
            if (resource.chargeType === ResourceChargeType.PER_RUN_RECHARGE) {
                resource.current = resource.max;
            }
        });

        // Update UI to show resources
        if (this.ui) {
            this.ui.renderEncounter(this.encounters.get(encounterId));
        }
    }

    useResource(resourceName, encounterId) {
        // Try to use a resource
        // Check per-encounter resources first
        if (this.encounterResources.has(resourceName)) {
            const resource = this.encounterResources.get(resourceName);
            if (resource.current > 0) {
                resource.current--;
                this.executeResourceAbility(resourceName, encounterId);
                return true;
            }
            return false; // Out of charges
        }

        // Check per-run resources
        if (this.runResources.has(resourceName)) {
            const resource = this.runResources.get(resourceName);
            if (resource.current > 0) {
                resource.current--;
                this.executeResourceAbility(resourceName, encounterId);
                return true;
            }
            return false; // Out of charges
        }

        return false; // Resource not found
    }

    executeResourceAbility(resourceName, encounterId) {
        const encounter = this.encounters.get(encounterId);
        if (!encounter) return;

        switch(resourceName) {
            case 'Recompile':
                this.recompileEncounterHand(encounter);
                break;
            case 'Jack Out':
                this.jackOutEncounter(encounterId);
                break;
            case 'Rollback':
                this.rollbackTrick(encounter);
                break;
        }
    }

    recompileEncounterHand(encounter) {
        // Tuck current hand to bottom of deck, draw 5 new cards
        const cardsToTuck = [...encounter.hand];

        // Remove cards from encounter hand
        encounter.hand = [];

        // Add cards to bottom of deck
        cardsToTuck.forEach(card => {
            this.deck.cards.push(card);
        });

        // Draw 5 new cards
        for (let i = 0; i < 5; i++) {
            const card = this.deck.drawCard();
            if (card) {
                encounter.hand.push(card);
            }
        }

        // Show notification
        this.ui.showNotification('🔄 Recompiled', `Tucked ${cardsToTuck.length} cards, drew ${encounter.hand.length} new cards`, '🔄');

        // Update UI
        this.ui.renderEncounter(encounter);
    }

    jackOutEncounter(encounterId) {
        // Emergency disconnect - remove encounter from slot
        const encounter = this.encounters.get(encounterId);
        if (!encounter) return;

        // Return all cards to deck
        const allCards = encounter.getAllCards();
        allCards.forEach(card => {
            this.deck.cards.push(card);
        });

        // Remove encounter from map
        this.encounters.delete(encounterId);

        // Free the slot if it has one
        if (encounter.slotId !== null) {
            const slot = this.ui.slots.find(s => s.id === encounter.slotId);
            if (slot) {
                slot.encounterId = null;
                slot.status = 'unlocked'; // Return to unlocked state
            }
        }

        // Remove from UI
        this.ui.removeEncounter(encounterId, encounter.slotId);

        // Show notification
        this.ui.showNotification('🔌 Jacked Out', 'Emergency disconnect successful. Encounter removed from slot.', '🔌');

        // Update UI
        this.ui.updateGameStats();
    }

    rollbackTrick(encounter) {
        // Undo the last trick (trick-taking only)
        if (encounter.type.category !== 'trick-taking') {
            this.ui.showNotification('Invalid Action', 'Rollback only works in trick-taking encounters!', '⚠️');
            return;
        }

        if (encounter.completedTricks.length === 0) {
            this.ui.showNotification('No Tricks', 'No tricks to undo!', '⚠️');
            return;
        }

        // Get the last completed trick
        const lastTrick = encounter.completedTricks.pop();

        // Return cards to hands
        encounter.hand.push(lastTrick.playerCard);
        encounter.opponentHand.push(lastTrick.opponentCard);

        // Revert score
        if (lastTrick.winner === 'player') {
            encounter.tricksWon--;
        } else {
            encounter.opponentTricksWon--;
        }

        // Show notification
        this.ui.showNotification('⏮️ Rolled Back', 'Last trick undone. Cards returned to hands.', '⏮️');

        // Update UI
        this.ui.renderEncounter(encounter);
    }

    // ===== Command System Methods (Exploits) =====

    addCommand(command) {
        // Add a command to inventory (max 5)
        if (this.commands.length >= this.maxCommands) {
            this.ui.showNotification('Inventory Full', `Cannot carry more than ${this.maxCommands} commands!`, '⚠️');
            return false;
        }

        // Create a unique instance of the command
        const commandInstance = {
            ...command,
            instanceId: `${command.name}-${Date.now()}-${Math.random()}`
        };

        this.commands.push(commandInstance);
        this.ui.showNotification('Exploit Acquired', `${command.icon} ${command.displayName} added to inventory`, command.icon);
        this.ui.updateCommandInventory();
        return true;
    }

    useCommand(commandInstanceId) {
        // Select a command for use
        const commandIndex = this.commands.findIndex(c => c.instanceId === commandInstanceId);
        if (commandIndex === -1) return false;

        const command = this.commands[commandIndex];

        // Check if command requires card selection
        if (command.mode === CommandMode.CARD_SELECT) {
            // Enter card selection mode
            this.commandInUse = { command, commandIndex };
            this.ui.showNotification('Select Card', `${command.icon} ${command.displayName}: Click a card from your deck`, command.icon);
            this.ui.enterCardSelectionMode();
            return true;
        }

        // Immediate execution commands
        if (command.mode === CommandMode.IMMEDIATE) {
            const result = command.execute(this);
            if (result.success) {
                this.commands.splice(commandIndex, 1); // Remove used command
                this.ui.showNotification(command.displayName, result.message, result.icon);
                this.ui.updateCommandInventory();
            } else {
                this.ui.showNotification('Failed', result.message, '⚠️');
            }
            return result.success;
        }

        return false;
    }

    executeCommandOnCard(cardId, delta = null) {
        // Execute the selected command on a chosen card
        if (!this.commandInUse) return false;

        const { command, commandIndex } = this.commandInUse;

        // Execute the command
        const result = command.execute(this, cardId, delta);

        if (result.success) {
            // Remove the command from inventory
            this.commands.splice(commandIndex, 1);
            this.ui.showNotification(command.displayName, result.message, result.icon);
            this.ui.updateCommandInventory();
            this.ui.updateGameStats(); // Refresh deck display
        } else {
            this.ui.showNotification('Failed', result.message, '⚠️');
        }

        // Clear selection mode
        this.commandInUse = null;
        this.ui.exitCardSelectionMode();

        return result.success;
    }

    cancelCommandSelection() {
        // Cancel command selection mode
        if (this.commandInUse) {
            this.ui.showNotification('Cancelled', 'Command selection cancelled', 'ℹ️');
            this.commandInUse = null;
            this.ui.exitCardSelectionMode();
        }
    }

    generateNextEncounterOptions() {
        // Pre-generate the next encounter options for preview
        this.nextEncounterOptions = this.generateEncounterOptions(3);
    }

    showEncounterSelection() {
        // Check if we have available encounter slots
        if (this.encounters.size >= this.maxEncounterSlots) {
            // Check if this is a deadlock situation
            const allFailed = Array.from(this.encounters.values()).every(enc => enc.failed);
            if (allFailed) {
                this.checkDeadlock();
            } else {
                this.ui.showNotification('⚠️ Slots Full', 'All encounter slots are full! Complete or abandon an encounter first.', '⚠️');
            }
            return;
        }

        // Check if we have enough cards left
        if (this.deck.size < 2) {
            this.ui.showNotification('⚠️ Not Enough Cards', 'Not enough cards in deck!', '⚠️');
            return;
        }

        // Use pre-generated options
        this.ui.showEncounterSelection(this.nextEncounterOptions);
    }

    generateEncounterOptions(count) {
        const bossAvailable = this.encountersCleared >= this.encountersNeededForBoss;
        const mustFightBoss = bossAvailable && this.bossDeclineCount >= this.maxBossDeclines;

        // If must fight boss, only offer boss encounters
        if (mustFightBoss) {
            const bossEncounters = Object.keys(EncounterTypes)
                .filter(key => EncounterTypes[key].difficulty === Difficulty.BOSS)
                .map(key => EncounterTypes[key]);

            return bossEncounters.slice(0, count);
        }

        // Get non-boss encounters
        const normalEncounters = Object.keys(EncounterTypes)
            .filter(key => EncounterTypes[key].difficulty !== Difficulty.BOSS)
            .map(key => EncounterTypes[key]);

        const options = [];

        // If boss available (but not mandatory), include 1 boss option
        if (bossAvailable) {
            const bossEncounters = Object.keys(EncounterTypes)
                .filter(key => EncounterTypes[key].difficulty === Difficulty.BOSS)
                .map(key => EncounterTypes[key]);

            const randomBoss = bossEncounters[Math.floor(Math.random() * bossEncounters.length)];
            options.push(randomBoss);
            count--; // One less normal encounter to generate
        }

        // Fill remaining slots with normal encounters
        for (let i = 0; i < count; i++) {
            const randomType = normalEncounters[Math.floor(Math.random() * normalEncounters.length)];
            options.push(randomType);
        }

        // Shuffle the options so boss isn't always in same position
        return options.sort(() => Math.random() - 0.5);
    }

    playEncounterFromHand(handIndex, slotId) {
        // Play an encounter card from hand into a specific slot
        if (handIndex < 0 || handIndex >= this.encounterHand.length) {
            console.error('Invalid hand index');
            return null;
        }

        // Get the encounter type from hand
        const encounterType = this.encounterHand[handIndex];

        // Remove from hand
        this.encounterHand.splice(handIndex, 1);

        // Create encounter with slot assignment
        const encounterId = this.nextEncounterId++;
        const encounter = new Encounter(encounterId, encounterType, slotId);

        // Draw initial cards
        const initialCards = this.deck.draw(encounterType.initialHandSize || 3);
        if (initialCards.length < encounterType.initialHandSize) {
            this.ui.showNotification('⚠️ Not Enough Cards', 'Not enough cards in deck!', '⚠️');
            // Put encounter card back in hand
            this.encounterHand.splice(handIndex, 0, encounterType);
            return null;
        }

        initialCards.forEach(card => encounter.addCardToHand(card));

        this.encounters.set(encounterId, encounter);
        this.ui.renderEncounter(encounter);

        // Don't auto-refill hand - player must draw manually
        this.ui.updateEncounterHand();

        this.ui.updateGameStats();

        return encounter;
    }

    startNewEncounter(encounterType) {
        // DEPRECATED - keeping for compatibility during transition
        // Track boss decline if applicable
        const bossAvailable = this.encountersCleared >= this.encountersNeededForBoss;
        const choseNonBoss = encounterType.difficulty !== Difficulty.BOSS;

        if (bossAvailable && choseNonBoss && !this.bossDefeated) {
            this.bossDeclineCount++;
        }

        // encounterType should be one of the EncounterTypes
        const encounterId = this.nextEncounterId++;
        const encounter = new Encounter(encounterId, encounterType);

        // Draw initial cards
        const initialCards = this.deck.draw(encounterType.initialHandSize || 3);
        initialCards.forEach(card => encounter.addCardToHand(card));

        this.encounters.set(encounterId, encounter);
        this.ui.renderEncounter(encounter);

        // Generate new options for preview
        this.generateNextEncounterOptions();
        this.ui.updateGameStats();

        return encounter;
    }

    drawCardForEncounter(encounterId) {
        const encounter = this.encounters.get(encounterId);
        if (!encounter || encounter.completed || encounter.failed) {
            return false;
        }

        if (this.deck.size === 0) {
            this.ui.showNotification('⚠️ No Cards', 'No cards left in deck!', '⚠️');
            return false;
        }

        const cards = this.deck.draw(1);
        if (cards.length > 0) {
            encounter.addCardToHand(cards[0]);
            this.ui.renderEncounter(encounter);
            this.ui.updateGameStats();
            return true;
        }

        return false;
    }

    playCardInEncounter(encounterId, cardId) {
        const encounter = this.encounters.get(encounterId);
        if (!encounter || encounter.completed || encounter.failed) {
            return false;
        }

        const card = encounter.playCard(cardId);
        if (card) {
            this.ui.renderEncounter(encounter);
            this.checkEncounterStatus(encounterId);
            return true;
        }

        return false;
    }

    playTrickCardInEncounter(encounterId, cardId) {
        const encounter = this.encounters.get(encounterId);
        if (!encounter || encounter.completed || encounter.failed) {
            return false;
        }

        const card = encounter.playTrickCard(cardId);
        if (card) {
            this.ui.renderEncounter(encounter);
            this.checkEncounterStatus(encounterId);
            return true;
        }

        return false;
    }

    checkEncounterStatus(encounterId) {
        const encounter = this.encounters.get(encounterId);
        if (!encounter) return;

        if (encounter.checkWinCondition()) {
            encounter.completed = true;
            this.ui.renderEncounter(encounter);
            setTimeout(() => {
                this.ui.showNotification('✅ Encounter Complete!', `"${encounter.type.name}" completed!`, '✅');
            }, 100);
        } else if (encounter.checkFailCondition()) {
            encounter.failed = true;
            this.ui.renderEncounter(encounter);
            setTimeout(() => {
                this.ui.showNotification('❌ Encounter Failed', `"${encounter.type.name}" failed!\n\nSlot is now locked.`, '❌');
                this.checkDeadlock();
            }, 100);
        } else {
            this.ui.renderEncounter(encounter);
        }
    }

    checkDeadlock() {
        // Check if all encounters are failed (deadlock condition)
        const allFailed = Array.from(this.encounters.values()).every(enc => enc.failed);
        const hasEncounters = this.encounters.size > 0;

        if (allFailed && hasEncounters) {
            // Deadlock detected!
            setTimeout(() => {
                this.ui.showConfirmation(
                    '⚠️ DEADLOCK DETECTED',
                    'All encounter slots are locked with failed encounters.\n\nYou cannot progress further.\n\nJack out and end the run?',
                    (confirmed) => {
                        if (confirmed) {
                            this.endRun(false); // false = defeated/jacked out
                        }
                    }
                );
            }, 500);
        }
    }

    endRun(victory) {
        const title = victory ? '🎉 VICTORY!' : '💀 Run Ended';
        const message = victory
            ? 'You completed the run!'
            : 'You jacked out of the system.';
        const icon = victory ? '🎉' : '💀';

        this.ui.showNotification(title, message, icon);

        // For now, just reset the game
        // TODO: Show stats screen and meta rewards
        setTimeout(() => {
            this.resetGame();
        }, 1500);
    }

    generateRewardCards(count) {
        // Reward cards are cards not in starting deck (4-K)
        const suits = ['♠', '♥', '♣', '♦'];
        const rewardRanks = ['4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

        const rewardCards = [];
        for (let i = 0; i < count; i++) {
            const randomRank = rewardRanks[Math.floor(Math.random() * rewardRanks.length)];
            const randomSuit = suits[Math.floor(Math.random() * suits.length)];
            rewardCards.push(new Card(randomRank, randomSuit));
        }

        return rewardCards;
    }

    completeEncounter(encounterId) {
        const encounter = this.encounters.get(encounterId);
        if (!encounter || !encounter.completed || encounter.rewardsCollected) {
            return false;
        }

        // Generate rewards based on difficulty
        const difficulty = encounter.type.difficulty;
        let rewardCards = [];

        if (difficulty === Difficulty.EASY) {
            // Auto-give 1 card
            rewardCards = this.generateRewardCards(1);
            this.finalizeEncounterCompletion(encounterId, rewardCards);
        } else if (difficulty === Difficulty.MEDIUM) {
            // Show choice of 3 cards
            rewardCards = this.generateRewardCards(3);
            this.ui.showRewardSelection(encounterId, rewardCards, difficulty);
        } else if (difficulty === Difficulty.HARD) {
            // Show choice of 3 cards (bonus rewards TODO for later)
            rewardCards = this.generateRewardCards(3);
            this.ui.showRewardSelection(encounterId, rewardCards, difficulty);
        } else if (difficulty === Difficulty.BOSS) {
            // Show choice of 5 cards
            rewardCards = this.generateRewardCards(5);
            this.ui.showRewardSelection(encounterId, rewardCards, difficulty);
        }

        return true;
    }

    finalizeEncounterCompletion(encounterId, selectedRewardCards) {
        const encounter = this.encounters.get(encounterId);
        if (!encounter) return;

        // Mark rewards as collected and auto-minimize
        encounter.rewardsCollected = true;
        encounter.minimized = true;

        // Check if this was a boss encounter
        const wasBoss = encounter.type.difficulty === Difficulty.BOSS;

        // Return all cards to deck
        const cards = encounter.getAllCards();
        this.deck.returnCards(cards);

        // Add reward cards to deck
        selectedRewardCards.forEach(card => this.deck.cards.push(card));
        this.deck.shuffle();

        // Add command reward (50% chance for medium+, guaranteed for boss)
        const difficulty = encounter.type.difficulty;
        let shouldGiveCommand = false;

        if (difficulty === Difficulty.BOSS) {
            shouldGiveCommand = true;
        } else if (difficulty === Difficulty.HARD) {
            shouldGiveCommand = Math.random() < 0.7; // 70% chance
        } else if (difficulty === Difficulty.MEDIUM) {
            shouldGiveCommand = Math.random() < 0.5; // 50% chance
        }

        if (shouldGiveCommand) {
            const command = getRandomCommand();
            this.addCommand(command);
        }

        // Track progress
        this.encountersCleared++;

        // Check if we should force boss to top of deck
        if (!wasBoss && this.encountersCleared >= this.encountersNeededForBoss && !this.bossDefeated) {
            this.forceBossToTopOfDeck();
        }

        if (wasBoss) {
            this.bossDefeated = true;
            // Victory!
            setTimeout(() => {
                this.endRun(true);
            }, 500);
        }

        // Update encounter UI to show minimized state
        this.ui.renderEncounter(encounter);

        // Unlock new slots based on this slot's completion
        if (encounter.slotId !== null) {
            this.ui.unlockSlotsFromSlot(encounter.slotId);
        }

        // Don't remove encounter - keep it on map as history
        // Just free the slot for tracking purposes
        const slot = this.ui.slots.find(s => s.id === encounter.slotId);
        if (slot) {
            slot.encounterId = null; // Mark slot as available (but encounter stays visually)
        }

        this.ui.updateGameStats();
    }

    forceBossToTopOfDeck() {
        // Check if boss is already at top of deck
        if (this.encounterDeck.length > 0 && this.encounterDeck[0].difficulty === Difficulty.BOSS) {
            return; // Already at top
        }

        // Check if boss is in hand (already drawn)
        const hasBossInHand = this.encounterHand.some(enc => enc.difficulty === Difficulty.BOSS);
        if (hasBossInHand) return;

        // Find boss in deck
        const bossIndex = this.encounterDeck.findIndex(enc => enc.difficulty === Difficulty.BOSS);
        if (bossIndex === -1) return; // No boss in deck (already drawn or doesn't exist)

        // Remove boss from current position in deck
        const boss = this.encounterDeck.splice(bossIndex, 1)[0];

        // Place at top of deck (index 0, so it's drawn next)
        this.encounterDeck.unshift(boss);

        // Update UI to show boss is ready
        this.ui.updateEncounterHand();
        this.ui.showBossOnDeck(true);

        // Show notification
        this.ui.showNotification('👾 BOSS READY', 'The boss encounter is now on top of your deck! Draw it when ready.', '👾');
    }

    abandonEncounter(encounterId) {
        const encounter = this.encounters.get(encounterId);
        if (!encounter) {
            return false;
        }

        this.ui.showConfirmation(
            'Abandon Encounter?',
            `Are you sure you want to abandon "${encounter.type.name}"?\n\nThis will return all ${encounter.getAllCards().length} cards to the deck.`,
            (confirmed) => {
                if (confirmed) {
                    // Return all cards to deck
                    const cards = encounter.getAllCards();
                    this.deck.returnCards(cards);

                    // Remove encounter
                    const slotId = encounter.slotId;
                    this.encounters.delete(encounterId);
                    this.ui.removeEncounter(encounterId, slotId);
                    this.ui.updateGameStats();
                }
            }
        );

        return true;
    }

    toggleEncounterMinimize(encounterId) {
        const encounter = this.encounters.get(encounterId);
        if (!encounter) return;

        encounter.minimized = !encounter.minimized;

        // Refresh resources when expanding encounter (entering it)
        if (!encounter.minimized) {
            this.refreshEncounterResources(encounterId);
        } else {
            this.ui.renderEncounter(encounter);
        }
    }

    resetGame() {
        this.ui.showConfirmation(
            'Reset Game?',
            'Are you sure you want to reset the game?\n\nAll progress will be lost.',
            (confirmed) => {
                if (confirmed) {
                    this.deck = new Deck();
                    this.encounters.clear();
                    this.nextEncounterId = 1;
                    this.maxEncounterSlots = 2; // Reset to starting slots

                    // Reset progression
                    this.encountersCleared = 0;
                    this.bossDefeated = false;
                    this.bossDeclineCount = 0;

                    // Reset encounter deck and hand
                    this.initializeEncounterDeck();

                    // Regenerate next encounter options
                    this.generateNextEncounterOptions();

                    this.ui.reset();
                    this.ui.updateGameStats();
                }
            }
        );
    }

    getActiveEncounterCount() {
        return this.encounters.size;
    }

    getDeckSize() {
        return this.deck.size;
    }

    getDeckContents() {
        return this.deck.getContents();
    }

    getRunProgress() {
        return {
            cleared: this.encountersCleared,
            needed: this.encountersNeededForBoss,
            bossAvailable: this.encountersCleared >= this.encountersNeededForBoss,
            bossDefeated: this.bossDefeated
        };
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});

export { Game, Card, Deck, Encounter };
