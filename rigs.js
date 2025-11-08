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
            },
            {
                name: "Jack Out",
                charges: 2,
                chargeType: ResourceChargeType.PER_RUN,
                icon: "🔌",
                color: "red",
                description: "Emergency disconnect - remove encounter from slot"
            }
        ]
    },

    Tactician: {
        name: "Tactician Rig",
        description: "Trial and error mastery",
        difficulty: "Advanced",
        hardware: [
            {
                name: "Recompile",
                charges: 1,
                chargeType: ResourceChargeType.PER_ENCOUNTER,
                icon: "🔄",
                color: "blue",
                description: "Tuck your hand to bottom, draw 5 new cards"
            },
            {
                name: "Jack Out",
                charges: 1,
                chargeType: ResourceChargeType.PER_RUN,
                icon: "🔌",
                color: "red",
                description: "Emergency disconnect - remove encounter from slot"
            },
            {
                name: "Rollback",
                charges: 1,
                chargeType: ResourceChargeType.PER_RUN_RECHARGE,
                icon: "⏮️",
                color: "purple",
                description: "Undo the last trick played (trick-taking only)"
            }
        ]
    }
};

export { ResourceChargeType, StarterRigs };
