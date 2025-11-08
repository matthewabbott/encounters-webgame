/**
 * Programs System
 * Defines consumable programs that modify the deck permanently
 * Similar to Balatro tarots - one-time use deck manipulation
 */

/**
 * Program execution modes
 */
const ProgramMode = {
    CARD_SELECT: 'card-select',    // Select a card from deck
    VALUE_INPUT: 'value-input',    // Input a numeric value
    IMMEDIATE: 'immediate'         // Execute immediately
};

/**
 * Base Programs
 * Consumable one-time use items for deck manipulation
 */
const BasePrograms = {
    Duplicate: {
        name: "duplicate.bat",
        displayName: "Duplicate",
        description: "Copy a card permanently (adds to deck)",
        icon: "📋",
        rarity: "common",
        mode: ProgramMode.CARD_SELECT,

        execute(game, cardId) {
            const card = game.deck.cards.find(c => c.id === cardId);
            if (!card) return { success: false, message: "Card not found" };

            // Create a duplicate of the card (new instance)
            const duplicate = game.deck.createCard(card.rank, card.suit);
            game.deck.cards.push(duplicate);

            return {
                success: true,
                message: `Duplicated ${card.rank}${card.suit}`,
                icon: "📋"
            };
        }
    },

    Corrupt: {
        name: "corrupt.sh",
        displayName: "Corrupt",
        description: "Destroy a card permanently (removes from deck)",
        icon: "💥",
        rarity: "common",
        mode: ProgramMode.CARD_SELECT,

        execute(game, cardId) {
            const cardIndex = game.deck.cards.findIndex(c => c.id === cardId);
            if (cardIndex === -1) return { success: false, message: "Card not found" };

            const card = game.deck.cards[cardIndex];
            game.deck.cards.splice(cardIndex, 1);

            return {
                success: true,
                message: `Corrupted ${card.rank}${card.suit} (removed from deck)`,
                icon: "💥"
            };
        }
    },

    Modify: {
        name: "modify.py",
        displayName: "Modify",
        description: "Change a card's value by ±1 permanently",
        icon: "🔧",
        rarity: "uncommon",
        mode: ProgramMode.CARD_SELECT,
        modifyAmount: 1, // Can be +1 or -1

        execute(game, cardId, delta = 1) {
            const card = game.deck.cards.find(c => c.id === cardId);
            if (!card) return { success: false, message: "Card not found" };

            const oldValue = card.value;
            const newValue = Math.max(1, Math.min(13, card.value + delta));

            if (newValue === oldValue) {
                return {
                    success: false,
                    message: `Cannot modify ${card.rank}${card.suit} further`
                };
            }

            // Update card value and rank
            card.value = newValue;
            const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
            card.rank = ranks[newValue - 1];

            return {
                success: true,
                message: `Modified card from ${oldValue} to ${newValue} (${card.rank}${card.suit})`,
                icon: "🔧"
            };
        }
    }
};

/**
 * Program Pool - defines which programs can appear as rewards
 */
const ProgramPool = [
    { type: BasePrograms.Duplicate, weight: 10 },
    { type: BasePrograms.Corrupt, weight: 10 },
    { type: BasePrograms.Modify, weight: 5 }
];

/**
 * Get a random program from the pool
 */
function getRandomProgram() {
    const totalWeight = ProgramPool.reduce((sum, p) => sum + p.weight, 0);
    let random = Math.random() * totalWeight;

    for (const entry of ProgramPool) {
        random -= entry.weight;
        if (random <= 0) {
            return { ...entry.type }; // Return a copy
        }
    }

    return { ...ProgramPool[0].type }; // Fallback
}

export { ProgramMode, BasePrograms, ProgramPool, getRandomProgram };
