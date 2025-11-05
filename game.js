import { EncounterTypes, Difficulty } from './encounters.js';
import { UI } from './ui.js';

/**
 * Card class representing a playing card
 */
class Card {
    constructor(rank, suit) {
        this.rank = rank;
        this.suit = suit;
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
}

/**
 * Encounter class representing a single encounter
 */
class Encounter {
    constructor(id, type) {
        this.id = id;
        this.type = type;
        this.hand = [];
        this.playedCards = [];
        this.completed = false;
        this.failed = false;
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

        this.ui = new UI(this);
    }

    showEncounterSelection() {
        // Check if we have available encounter slots
        if (this.encounters.size >= this.maxEncounterSlots) {
            // Check if this is a deadlock situation
            const allFailed = Array.from(this.encounters.values()).every(enc => enc.failed);
            if (allFailed) {
                this.checkDeadlock();
            } else {
                alert('All encounter slots are full! Complete or abandon an encounter first.');
            }
            return;
        }

        // Check if we have enough cards left
        if (this.deck.size < 2) {
            alert('Not enough cards in deck!');
            return;
        }

        // Generate 3 encounter options
        const options = this.generateEncounterOptions(3);
        this.ui.showEncounterSelection(options);
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

    startNewEncounter(encounterType) {
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
        this.ui.updateGameStats();

        return encounter;
    }

    drawCardForEncounter(encounterId) {
        const encounter = this.encounters.get(encounterId);
        if (!encounter || encounter.completed || encounter.failed) {
            return false;
        }

        if (this.deck.size === 0) {
            alert('No cards left in deck!');
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

    checkEncounterStatus(encounterId) {
        const encounter = this.encounters.get(encounterId);
        if (!encounter) return;

        if (encounter.checkWinCondition()) {
            encounter.completed = true;
            this.ui.renderEncounter(encounter);
            setTimeout(() => {
                alert(`Encounter "${encounter.type.name}" completed!`);
            }, 100);
        } else if (encounter.checkFailCondition()) {
            encounter.failed = true;
            this.ui.renderEncounter(encounter);
            setTimeout(() => {
                alert(`Encounter "${encounter.type.name}" failed! Slot is now locked.`);
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
                const jackOut = confirm(
                    '⚠️ DEADLOCK DETECTED ⚠️\n\n' +
                    'All encounter slots are locked with failed encounters.\n' +
                    'You cannot progress further.\n\n' +
                    'Jack out and end the run?'
                );

                if (jackOut) {
                    this.endRun(false); // false = defeated/jacked out
                }
            }, 500);
        }
    }

    endRun(victory) {
        const message = victory
            ? '🎉 VICTORY! You completed the run! 🎉'
            : '💀 RUN ENDED 💀\n\nYou jacked out of the system.';

        alert(message);

        // For now, just reset the game
        // TODO: Show stats screen and meta rewards
        setTimeout(() => {
            this.resetGame();
        }, 100);
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
        if (!encounter || !encounter.completed) {
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

        // Check if this was a boss encounter
        const wasBoss = encounter.type.difficulty === Difficulty.BOSS;

        // Return all cards to deck
        const cards = encounter.getAllCards();
        this.deck.returnCards(cards);

        // Add reward cards to deck
        selectedRewardCards.forEach(card => this.deck.cards.push(card));
        this.deck.shuffle();

        // Track progress
        this.encountersCleared++;

        if (wasBoss) {
            this.bossDefeated = true;
            // Victory!
            setTimeout(() => {
                this.endRun(true);
            }, 500);
        }

        // Remove encounter
        this.encounters.delete(encounterId);
        this.ui.removeEncounter(encounterId);
        this.ui.updateGameStats();
    }

    abandonEncounter(encounterId) {
        const encounter = this.encounters.get(encounterId);
        if (!encounter) {
            return false;
        }

        const confirmAbandon = confirm(
            `Are you sure you want to abandon "${encounter.type.name}"? ` +
            `This will return all ${encounter.getAllCards().length} cards to the deck.`
        );

        if (!confirmAbandon) {
            return false;
        }

        // Return all cards to deck
        const cards = encounter.getAllCards();
        this.deck.returnCards(cards);

        // Remove encounter
        this.encounters.delete(encounterId);
        this.ui.removeEncounter(encounterId);
        this.ui.updateGameStats();

        return true;
    }

    resetGame() {
        const confirmReset = confirm('Are you sure you want to reset the game? All progress will be lost.');
        if (!confirmReset) {
            return;
        }

        this.deck = new Deck();
        this.encounters.clear();
        this.nextEncounterId = 1;
        this.maxEncounterSlots = 2; // Reset to starting slots

        // Reset progression
        this.encountersCleared = 0;
        this.bossDefeated = false;
        this.bossDeclineCount = 0;

        this.ui.reset();
        this.ui.updateGameStats();
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
