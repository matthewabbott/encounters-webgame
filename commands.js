/**
 * Commands System (Exploits)
 * Defines consumable commands that modify the deck permanently
 * Commands are simple exploits - vulnerabilities in the system you can use once before they're patched
 * Similar to Balatro tarots - one-time use deck manipulation
 */

/**
 * Command execution modes
 */
const CommandMode = {
    CARD_SELECT: 'card-select',    // Select a card from deck
    VALUE_INPUT: 'value-input',    // Input a numeric value
    IMMEDIATE: 'immediate'         // Execute immediately
};

/**
 * Base Commands
 * Simple shell commands you can run through system vulnerabilities (exploits)
 * Each command is consumable - the system patches the vulnerability after use
 */
const BaseCommands = {
    Fork: {
        name: "fork",
        displayName: "fork",
        description: "Copy a card permanently (adds to deck)",
        icon: "⑂",
        rarity: "common",
        mode: CommandMode.CARD_SELECT,

        execute(game, cardId) {
            const card = game.deck.cards.find(c => c.id === cardId);
            if (!card) return { success: false, message: "Card not found" };

            // Create a duplicate of the card (new instance)
            const duplicate = game.deck.createCard(card.rank, card.suit);
            game.deck.cards.push(duplicate);

            return {
                success: true,
                message: `Forked ${card.rank}${card.suit}`,
                icon: "⑂"
            };
        }
    },

    Shred: {
        name: "shred",
        displayName: "shred",
        description: "Destroy a card permanently (removes from deck)",
        icon: "🗑️",
        rarity: "common",
        mode: CommandMode.CARD_SELECT,

        execute(game, cardId) {
            const cardIndex = game.deck.cards.findIndex(c => c.id === cardId);
            if (cardIndex === -1) return { success: false, message: "Card not found" };

            const card = game.deck.cards[cardIndex];
            game.deck.cards.splice(cardIndex, 1);

            return {
                success: true,
                message: `Shredded ${card.rank}${card.suit} (removed from deck)`,
                icon: "🗑️"
            };
        }
    },

    Increment: {
        name: "++",
        displayName: "++",
        description: "Change a card's value by ±1 permanently",
        icon: "⬆️⬇️",
        rarity: "uncommon",
        mode: CommandMode.CARD_SELECT,
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
                icon: "⬆️⬇️"
            };
        }
    }
};

/**
 * Command Pool - defines which commands can appear as exploit rewards
 */
const CommandPool = [
    { type: BaseCommands.Fork, weight: 10 },
    { type: BaseCommands.Shred, weight: 10 },
    { type: BaseCommands.Increment, weight: 5 }
];

/**
 * Get a random command from the pool
 */
function getRandomCommand() {
    const totalWeight = CommandPool.reduce((sum, c) => sum + c.weight, 0);
    let random = Math.random() * totalWeight;

    for (const entry of CommandPool) {
        random -= entry.weight;
        if (random <= 0) {
            return { ...entry.type }; // Return a copy
        }
    }

    return { ...CommandPool[0].type }; // Fallback
}

export { CommandMode, BaseCommands, CommandPool, getRandomCommand };
