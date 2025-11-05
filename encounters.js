/**
 * Encounter Type Definitions
 * Each encounter type defines:
 * - name: Display name
 * - description: What the player needs to do
 * - initialHandSize: How many cards to draw at start
 * - checkWin: Function to check if encounter is won
 * - checkFail: Function to check if encounter is failed
 * - getProgress: Function to get progress string
 */

const EncounterTypes = {
    /**
     * Sum Target: Play cards that sum to exactly a target value
     */
    SumTarget: {
        name: "Sum Target",
        description: "Play cards that sum to exactly 21",
        initialHandSize: 5,
        targetSum: 21,

        checkWin(encounter) {
            const sum = encounter.playedCards.reduce((acc, card) => acc + card.value, 0);
            return sum === this.targetSum;
        },

        checkFail(encounter) {
            const sum = encounter.playedCards.reduce((acc, card) => acc + card.value, 0);
            return sum > this.targetSum;
        },

        getProgress(encounter) {
            const sum = encounter.playedCards.reduce((acc, card) => acc + card.value, 0);
            return `Current sum: ${sum} / ${this.targetSum} (${encounter.playedCards.length} cards played)`;
        }
    },

    /**
     * High Card: Play the highest value card possible (ends when you play a card)
     */
    HighCard: {
        name: "High Card",
        description: "Draw cards and play when you have a King (value 13)",
        initialHandSize: 3,

        checkWin(encounter) {
            return encounter.playedCards.some(card => card.value === 13);
        },

        checkFail(encounter) {
            // Fail if you play 3 cards without hitting a King
            return encounter.playedCards.length >= 3 && !this.checkWin(encounter);
        },

        getProgress(encounter) {
            const maxPlayed = encounter.playedCards.length > 0
                ? Math.max(...encounter.playedCards.map(c => c.value))
                : 0;
            return `Cards played: ${encounter.playedCards.length}/3 | Highest: ${maxPlayed}`;
        }
    },

    /**
     * Color Match: Play 5 cards of the same color
     */
    ColorMatch: {
        name: "Color Match",
        description: "Play 5 cards of the same color (all red or all black)",
        initialHandSize: 5,

        checkWin(encounter) {
            if (encounter.playedCards.length < 5) return false;

            const firstColor = encounter.playedCards[0].color;
            return encounter.playedCards.every(card => card.color === firstColor);
        },

        checkFail(encounter) {
            if (encounter.playedCards.length < 2) return false;

            const colors = encounter.playedCards.map(c => c.color);
            const uniqueColors = new Set(colors);

            // If we have both colors and 5+ cards, we've failed
            return uniqueColors.size > 1 && encounter.playedCards.length >= 5;
        },

        getProgress(encounter) {
            const colors = encounter.playedCards.map(c => c.color);
            const colorCounts = colors.reduce((acc, color) => {
                acc[color] = (acc[color] || 0) + 1;
                return acc;
            }, {});

            return `Cards played: ${encounter.playedCards.length}/5 | Red: ${colorCounts.red || 0}, Black: ${colorCounts.black || 0}`;
        }
    },

    /**
     * Avoid Tricks: Play all your cards without hitting face cards
     */
    AvoidTricks: {
        name: "Avoid Tricks",
        description: "Play all cards in your hand, but avoid playing face cards (J, Q, K)",
        initialHandSize: 4,

        checkWin(encounter) {
            // Win if hand is empty and we haven't played any face cards
            return encounter.hand.length === 0 &&
                   !encounter.playedCards.some(card => card.value >= 11);
        },

        checkFail(encounter) {
            // Fail if we play any face card
            return encounter.playedCards.some(card => card.value >= 11);
        },

        getProgress(encounter) {
            const faceCardsInHand = encounter.hand.filter(c => c.value >= 11).length;
            return `Hand: ${encounter.hand.length} cards | Face cards in hand: ${faceCardsInHand} | Played: ${encounter.playedCards.length}`;
        }
    },

    /**
     * Suit Run: Play 4 cards of the same suit
     */
    SuitRun: {
        name: "Suit Run",
        description: "Play 4 cards of the same suit",
        initialHandSize: 5,

        checkWin(encounter) {
            if (encounter.playedCards.length < 4) return false;

            const suitCounts = encounter.playedCards.reduce((acc, card) => {
                acc[card.suit] = (acc[card.suit] || 0) + 1;
                return acc;
            }, {});

            return Object.values(suitCounts).some(count => count >= 4);
        },

        checkFail(encounter) {
            // Can't fail this one, just takes longer
            return false;
        },

        getProgress(encounter) {
            const suitCounts = encounter.playedCards.reduce((acc, card) => {
                acc[card.suit] = (acc[card.suit] || 0) + 1;
                return acc;
            }, {});

            const maxSuit = Object.entries(suitCounts).reduce((max, [suit, count]) => {
                return count > max.count ? { suit, count } : max;
            }, { suit: 'none', count: 0 });

            return `Best suit: ${maxSuit.suit} (${maxSuit.count}/4 cards)`;
        }
    },

    /**
     * Pair Up: Play exactly 2 cards with the same rank
     */
    PairUp: {
        name: "Pair Up",
        description: "Play exactly 2 cards with the same rank, then stop",
        initialHandSize: 4,

        checkWin(encounter) {
            if (encounter.playedCards.length !== 2) return false;

            return encounter.playedCards[0].rank === encounter.playedCards[1].rank;
        },

        checkFail(encounter) {
            if (encounter.playedCards.length < 2) return false;
            if (encounter.playedCards.length === 2) {
                return encounter.playedCards[0].rank !== encounter.playedCards[1].rank;
            }
            return encounter.playedCards.length > 2;
        },

        getProgress(encounter) {
            const played = encounter.playedCards.length;
            if (played === 0) {
                return `Play 2 cards with matching rank`;
            } else if (played === 1) {
                return `First card: ${encounter.playedCards[0].rank} (need matching rank)`;
            } else {
                return `Played ${played} cards`;
            }
        }
    }
};

export { EncounterTypes };
