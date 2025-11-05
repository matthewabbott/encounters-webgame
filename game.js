import { EncounterTypes } from './encounters.js';
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
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

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
        this.ui = new UI(this);
    }

    startNewEncounter() {
        // Check if we have enough cards left
        if (this.deck.size < 3) {
            alert('Not enough cards in deck! Complete some encounters first.');
            return null;
        }

        // Pick a random encounter type
        const typeNames = Object.keys(EncounterTypes);
        const randomType = EncounterTypes[typeNames[Math.floor(Math.random() * typeNames.length)]];

        const encounterId = this.nextEncounterId++;
        const encounter = new Encounter(encounterId, randomType);

        // Draw initial cards
        const initialCards = this.deck.draw(randomType.initialHandSize || 5);
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
                alert(`Encounter "${encounter.type.name}" failed!`);
            }, 100);
        } else {
            this.ui.renderEncounter(encounter);
        }
    }

    completeEncounter(encounterId) {
        const encounter = this.encounters.get(encounterId);
        if (!encounter || !encounter.completed) {
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
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});

export { Game, Card, Deck, Encounter };
