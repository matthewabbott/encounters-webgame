/**
 * Encounter Type Definitions
 * Each encounter type defines:
 * - name: Display name
 * - description: What the player needs to do
 * - difficulty: 'easy', 'medium', 'hard', or 'boss'
 * - initialHandSize: How many cards to draw at start
 * - checkWin: Function to check if encounter is won
 * - checkFail: Function to check if encounter is failed
 * - getProgress: Function to get progress string
 */

const Difficulty = {
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard',
    BOSS: 'boss'
};

const EncounterTypes = {
    /**
     * Sum Target (Easy): Play cards that sum to exactly a small target value
     */
    SumTargetEasy: {
        name: "Sum Target",
        description: "Play cards that sum to exactly 6",
        difficulty: Difficulty.EASY,
        initialHandSize: 3,
        targetSum: 6,

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
     * Sum Target (Medium): Play cards that sum to exactly a target value
     */
    SumTarget: {
        name: "Sum Target",
        description: "Play cards that sum to exactly 9",
        difficulty: Difficulty.MEDIUM,
        initialHandSize: 4,
        targetSum: 9,

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
     * High Card (Easy): Play your highest value card
     */
    HighCard: {
        name: "High Card",
        description: "Play a card with value 3",
        difficulty: Difficulty.EASY,
        initialHandSize: 2,

        checkWin(encounter) {
            return encounter.playedCards.some(card => card.value === 3);
        },

        checkFail(encounter) {
            // Fail if you play 2 cards without hitting a 3
            return encounter.playedCards.length >= 2 && !this.checkWin(encounter);
        },

        getProgress(encounter) {
            const maxPlayed = encounter.playedCards.length > 0
                ? Math.max(...encounter.playedCards.map(c => c.value))
                : 0;
            return `Cards played: ${encounter.playedCards.length}/2 | Highest: ${maxPlayed}`;
        }
    },

    /**
     * Color Match (Medium): Play 3 cards of the same color
     */
    ColorMatch: {
        name: "Color Match",
        description: "Play 3 cards of the same color (all red or all black)",
        difficulty: Difficulty.MEDIUM,
        initialHandSize: 3,

        checkWin(encounter) {
            if (encounter.playedCards.length < 3) return false;

            const firstColor = encounter.playedCards[0].color;
            return encounter.playedCards.every(card => card.color === firstColor);
        },

        checkFail(encounter) {
            if (encounter.playedCards.length < 2) return false;

            const colors = encounter.playedCards.map(c => c.color);
            const uniqueColors = new Set(colors);

            // If we have both colors and 3+ cards, we've failed
            return uniqueColors.size > 1 && encounter.playedCards.length >= 3;
        },

        getProgress(encounter) {
            const colors = encounter.playedCards.map(c => c.color);
            const colorCounts = colors.reduce((acc, color) => {
                acc[color] = (acc[color] || 0) + 1;
                return acc;
            }, {});

            return `Cards played: ${encounter.playedCards.length}/3 | Red: ${colorCounts.red || 0}, Black: ${colorCounts.black || 0}`;
        }
    },

    /**
     * Play All (Medium): Play all your cards
     */
    PlayAll: {
        name: "Play All",
        description: "Play all cards in your hand",
        difficulty: Difficulty.MEDIUM,
        initialHandSize: 3,

        checkWin(encounter) {
            // Win if hand is empty
            return encounter.hand.length === 0;
        },

        checkFail(encounter) {
            // Can't fail this one
            return false;
        },

        getProgress(encounter) {
            return `Hand: ${encounter.hand.length} cards remaining | Played: ${encounter.playedCards.length}`;
        }
    },

    /**
     * Suit Run (Hard): Play 3 cards of the same suit
     */
    SuitRun: {
        name: "Suit Run",
        description: "Play 3 cards of the same suit",
        difficulty: Difficulty.HARD,
        initialHandSize: 3,

        checkWin(encounter) {
            if (encounter.playedCards.length < 3) return false;

            const suitCounts = encounter.playedCards.reduce((acc, card) => {
                acc[card.suit] = (acc[card.suit] || 0) + 1;
                return acc;
            }, {});

            return Object.values(suitCounts).some(count => count >= 3);
        },

        checkFail(encounter) {
            // Fail if you've played 3 cards and don't have 3 of same suit
            if (encounter.playedCards.length < 3) return false;
            return !this.checkWin(encounter);
        },

        getProgress(encounter) {
            const suitCounts = encounter.playedCards.reduce((acc, card) => {
                acc[card.suit] = (acc[card.suit] || 0) + 1;
                return acc;
            }, {});

            const maxSuit = Object.entries(suitCounts).reduce((max, [suit, count]) => {
                return count > max.count ? { suit, count } : max;
            }, { suit: 'none', count: 0 });

            return `Best suit: ${maxSuit.suit} (${maxSuit.count}/3 cards)`;
        }
    },

    /**
     * Pair Up (Hard): Play exactly 2 cards with the same rank
     */
    PairUp: {
        name: "Pair Up",
        description: "Play exactly 2 cards with the same rank, then stop",
        difficulty: Difficulty.HARD,
        initialHandSize: 3,

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
    },

    /**
     * BOSS: All In - Play all cards from hand AND achieve sum target
     */
    BossAllIn: {
        name: "Final Lock: All In",
        description: "Play ALL cards in your hand AND make them sum to exactly 9",
        difficulty: Difficulty.BOSS,
        initialHandSize: 4,
        targetSum: 9,

        checkWin(encounter) {
            // Must have empty hand AND correct sum
            return encounter.hand.length === 0 &&
                   encounter.playedCards.reduce((sum, card) => sum + card.value, 0) === this.targetSum;
        },

        checkFail(encounter) {
            // Fail if you've played all cards but don't have correct sum
            if (encounter.hand.length === 0) {
                const sum = encounter.playedCards.reduce((s, card) => s + card.value, 0);
                return sum !== this.targetSum;
            }
            return false;
        },

        getProgress(encounter) {
            const sum = encounter.playedCards.reduce((s, card) => s + card.value, 0);
            return `Hand: ${encounter.hand.length} | Sum: ${sum}/${this.targetSum} | Must play ALL cards!`;
        }
    },

    /**
     * BOSS: Perfect Sequence - Play A, 2, 3 in order
     */
    BossPerfectSequence: {
        name: "Final Lock: Sequence",
        description: "Play cards in exact sequence: A, then 2, then 3",
        difficulty: Difficulty.BOSS,
        initialHandSize: 4,

        checkWin(encounter) {
            if (encounter.playedCards.length !== 3) return false;
            return encounter.playedCards[0].rank === 'A' &&
                   encounter.playedCards[1].rank === '2' &&
                   encounter.playedCards[2].rank === '3';
        },

        checkFail(encounter) {
            // Fail if sequence is broken
            if (encounter.playedCards.length >= 1 && encounter.playedCards[0].rank !== 'A') return true;
            if (encounter.playedCards.length >= 2 && encounter.playedCards[1].rank !== '2') return true;
            if (encounter.playedCards.length >= 3) {
                return !this.checkWin(encounter);
            }
            return false;
        },

        getProgress(encounter) {
            const needed = ['A', '2', '3'];
            const progress = needed.slice(0, encounter.playedCards.length)
                .map((rank, i) => encounter.playedCards[i]?.rank === rank ? '✓' : '✗')
                .join(' ');
            return `Sequence: ${progress || 'None'} | Next: ${needed[encounter.playedCards.length] || 'Done!'}`;
        }
    }
};

export { EncounterTypes, Difficulty };
