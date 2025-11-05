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
    },

    /**
     * Chain Reaction (Hard): Play cards in ascending order
     */
    ChainReaction: {
        name: "Chain Reaction",
        description: "Play 3 cards in strictly ascending order (each higher than the last)",
        difficulty: Difficulty.HARD,
        initialHandSize: 4,

        checkWin(encounter) {
            if (encounter.playedCards.length < 3) return false;

            // Check if all cards are in ascending order
            for (let i = 1; i < encounter.playedCards.length; i++) {
                if (encounter.playedCards[i].value <= encounter.playedCards[i - 1].value) {
                    return false;
                }
            }
            return encounter.playedCards.length >= 3;
        },

        checkFail(encounter) {
            // Fail if chain is broken
            for (let i = 1; i < encounter.playedCards.length; i++) {
                if (encounter.playedCards[i].value <= encounter.playedCards[i - 1].value) {
                    return true;
                }
            }
            return false;
        },

        getProgress(encounter) {
            const played = encounter.playedCards.length;
            if (played === 0) {
                return `Play 3 cards in ascending order`;
            }
            const lastValue = encounter.playedCards[played - 1].value;
            return `Chain: ${played}/3 cards | Last: ${lastValue} (next must be >${lastValue})`;
        }
    },

    /**
     * Two-Stage Challenge (Medium): Multi-stage encounter
     */
    TwoStage: {
        name: "Two-Stage Lock",
        description: "Stage 1: Sum to 5. Stage 2: Play a card matching first stage's suit",
        difficulty: Difficulty.MEDIUM,
        initialHandSize: 4,

        initState(encounter) {
            if (!encounter.customState) {
                encounter.customState = {
                    stage: 1,
                    stage1Complete: false,
                    stage1Suit: null
                };
            }
        },

        checkWin(encounter) {
            this.initState(encounter);
            const state = encounter.customState;

            // Stage 1: Sum to 5
            if (state.stage === 1) {
                const sum = encounter.playedCards.reduce((acc, card) => acc + card.value, 0);
                if (sum === 5) {
                    state.stage1Complete = true;
                    state.stage1Suit = encounter.playedCards[0].suit; // Remember first suit
                    state.stage = 2;
                    state.stage1PlayedCount = encounter.playedCards.length;
                    return false; // Not done yet, advance to stage 2
                }
            }

            // Stage 2: Play a card matching stage 1's suit
            if (state.stage === 2) {
                const stage2Cards = encounter.playedCards.slice(state.stage1PlayedCount || 0);
                return stage2Cards.some(card => card.suit === state.stage1Suit);
            }

            return false;
        },

        checkFail(encounter) {
            this.initState(encounter);
            const state = encounter.customState;

            if (state.stage === 1) {
                const sum = encounter.playedCards.reduce((acc, card) => acc + card.value, 0);
                return sum > 5;
            }

            // Stage 2: Fail if you play wrong suit
            if (state.stage === 2) {
                const stage2Cards = encounter.playedCards.slice(state.stage1PlayedCount || 0);
                if (stage2Cards.length > 0) {
                    // Fail if played a card that doesn't match
                    return stage2Cards.every(card => card.suit !== state.stage1Suit);
                }
            }

            return false;
        },

        getProgress(encounter) {
            this.initState(encounter);
            const state = encounter.customState;

            if (state.stage === 1) {
                const sum = encounter.playedCards.reduce((acc, card) => acc + card.value, 0);
                return `STAGE 1: Sum to 5 | Current: ${sum}/5`;
            } else {
                return `STAGE 2: Play a ${state.stage1Suit} card | Stage 1: ✓`;
            }
        }
    },

    /**
     * High Card Duel (Medium): Play against an opponent
     */
    HighCardDuel: {
        name: "High Card Duel",
        description: "Best of 3 rounds: Play your highest card each round to beat opponent",
        difficulty: Difficulty.MEDIUM,
        initialHandSize: 3,

        initState(encounter) {
            if (!encounter.customState) {
                // Generate opponent's cards (random values 1-3)
                const opponentCards = [
                    Math.floor(Math.random() * 3) + 1,
                    Math.floor(Math.random() * 3) + 1,
                    Math.floor(Math.random() * 3) + 1
                ];
                encounter.customState = {
                    opponentCards,
                    currentRound: 0,
                    playerWins: 0,
                    opponentWins: 0,
                    rounds: []
                };
            }
        },

        checkWin(encounter) {
            this.initState(encounter);
            const state = encounter.customState;

            // Process rounds
            const playerCards = encounter.playedCards;
            while (state.currentRound < playerCards.length && state.currentRound < 3) {
                const playerCard = playerCards[state.currentRound].value;
                const opponentCard = state.opponentCards[state.currentRound];

                const result = playerCard > opponentCard ? 'win' :
                              playerCard < opponentCard ? 'lose' : 'tie';

                if (state.rounds.length <= state.currentRound) {
                    state.rounds.push({ playerCard, opponentCard, result });

                    if (result === 'win') state.playerWins++;
                    if (result === 'lose') state.opponentWins++;
                }

                state.currentRound++;
            }

            return state.playerWins >= 2;
        },

        checkFail(encounter) {
            this.initState(encounter);
            const state = encounter.customState;

            // Check if we've processed all rounds
            this.checkWin(encounter);

            return state.opponentWins >= 2;
        },

        getProgress(encounter) {
            this.initState(encounter);
            const state = encounter.customState;

            const roundsPlayed = state.rounds.length;
            if (roundsPlayed === 0) {
                return `Round 1/3 | Play your highest card!`;
            }

            const lastRound = state.rounds[roundsPlayed - 1];
            const resultText = lastRound.result === 'win' ? '✓ WIN' :
                              lastRound.result === 'lose' ? '✗ LOSE' : '- TIE';

            return `Round ${roundsPlayed}/3: ${lastRound.playerCard} vs ${lastRound.opponentCard} ${resultText} | Score: ${state.playerWins}-${state.opponentWins}`;
        }
    },

    /**
     * Exact Budget (Medium): Spend exactly your budget
     */
    ExactBudget: {
        name: "Card Auction",
        description: "Cards cost their value. Spend EXACTLY 7 points (no more, no less)",
        difficulty: Difficulty.MEDIUM,
        initialHandSize: 4,
        budget: 7,

        checkWin(encounter) {
            const spent = encounter.playedCards.reduce((sum, card) => sum + card.value, 0);
            return spent === this.budget;
        },

        checkFail(encounter) {
            const spent = encounter.playedCards.reduce((sum, card) => sum + card.value, 0);
            return spent > this.budget;
        },

        getProgress(encounter) {
            const spent = encounter.playedCards.reduce((sum, card) => sum + card.value, 0);
            const remaining = this.budget - spent;
            return `Budget: ${spent}/${this.budget} spent | ${remaining} remaining`;
        }
    }
};

export { EncounterTypes, Difficulty };
