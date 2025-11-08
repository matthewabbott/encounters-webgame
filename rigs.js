/**
 * Rig and Hardware System
 * Defines starter rigs and their hardware/resource capabilities
 */

const ResourceChargeType = {
    PER_ENCOUNTER: 'per-encounter',      // Blue - refreshes each encounter
    PER_RUN: 'per-run',                 // Red - consumed permanently
    PER_RUN_RECHARGE: 'per-run-recharge' // Purple - recharges on encounter entry
};

/**
 * Starter Rigs
 * Players choose (or are assigned) a rig that defines their initial hardware
 */
const StarterRigs = {
    Analyst: {
        name: "Analyst Rig",
        description: "Tactical planning and adaptation",
        difficulty: "Beginner",
        hardware: [
            {
                name: "Recompile",
                charges: 2,
                chargeType: ResourceChargeType.PER_ENCOUNTER,
                icon: "🔄",
                color: "blue",
                description: "Tuck your hand to bottom, draw 5 new cards"
            }
        ]
    }

    // Future rigs:
    // Speedrunner: { ... Jack Out (per-run) ... }
    // Tactician: { ... Recompile + Jack Out + Rollback (per-run-recharge) ... }
};

export { ResourceChargeType, StarterRigs };
