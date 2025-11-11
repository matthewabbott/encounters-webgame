/**
 * Grid Map System
 * Handles 8×8 grid generation, fog of war, and socket state management
 */

import { Difficulty } from './encounters.js';

/**
 * Socket states
 */
export const SocketState = {
    HIDDEN: 'hidden',        // Behind fog of war
    VISIBLE: 'visible',      // Can see (adjacent to unlocked), shows hints
    UNLOCKED: 'unlocked',    // Active encounter, MEM allocated
    WON: 'won',             // Completed successfully, MEM freed
    FAILED: 'failed'        // Failed, MEM locked, blocks outbound
};

/**
 * GridSocket class - represents a single socket on the grid
 */
class GridSocket {
    constructor(x, y, encounterType = null) {
        this.x = x;
        this.y = y;
        this.id = `socket-${x}-${y}`;
        this.state = SocketState.HIDDEN;
        this.encounterType = encounterType; // Reference to encounter type from encounters.js
        this.encounter = null; // Active encounter instance
        this.isBoss = false;
        this.isWall = false; // Empty space on grid
    }

    /**
     * Get difficulty for this socket
     */
    get difficulty() {
        return this.encounterType?.difficulty || Difficulty.EASY;
    }

    /**
     * Get category for this socket
     */
    get category() {
        return this.encounterType?.category || 'unknown';
    }

    /**
     * Check if socket is traversable (won or unlocked)
     */
    get isTraversable() {
        return this.state === SocketState.WON || this.state === SocketState.UNLOCKED;
    }

    /**
     * Check if this socket blocks outbound unlocks
     */
    get blocksOutbound() {
        return this.state === SocketState.FAILED || this.isWall;
    }
}

/**
 * GridMap class - manages the 8×8 grid
 */
export class GridMap {
    constructor(encounterTypes) {
        this.size = 8;
        this.encounterTypes = encounterTypes;
        this.sockets = new Map(); // Map<id, GridSocket>
        this.startX = 0;
        this.startY = 0;
        this.bossX = 7;
        this.bossY = 7;

        this.generateGrid();
    }

    /**
     * Generate the 8×8 grid with encounters and gaps
     */
    generateGrid() {
        // Create all sockets
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                const socket = new GridSocket(x, y);

                // Check if this should be a wall (gap)
                if (this.shouldBeWall(x, y)) {
                    socket.isWall = true;
                    socket.state = SocketState.HIDDEN; // Walls stay hidden
                } else {
                    // Assign encounter based on position
                    socket.encounterType = this.getEncounterForPosition(x, y);
                }

                this.sockets.set(socket.id, socket);
            }
        }

        // Set up starting socket (top-left corner)
        const startSocket = this.getSocket(this.startX, this.startY);
        if (startSocket) {
            startSocket.state = SocketState.WON; // Start as already completed
            this.revealAdjacentSockets(this.startX, this.startY);
        }

        // Set up boss socket (bottom-right corner)
        const bossSocket = this.getSocket(this.bossX, this.bossY);
        if (bossSocket) {
            bossSocket.isBoss = true;
            bossSocket.state = SocketState.VISIBLE; // Boss is pre-revealed
            // Assign boss encounter
            const bossEncounters = this.encounterTypes.filter(e => e.difficulty === Difficulty.BOSS);
            if (bossEncounters.length > 0) {
                bossSocket.encounterType = bossEncounters[Math.floor(Math.random() * bossEncounters.length)];
            }
        }
    }

    /**
     * Determine if a position should be a wall/gap
     */
    shouldBeWall(x, y) {
        // Create some gaps for interesting paths
        // Don't block start or boss positions
        if ((x === this.startX && y === this.startY) || (x === this.bossX && y === this.bossY)) {
            return false;
        }

        // Create some random gaps (about 15% of grid)
        // Use deterministic random based on position for consistent generation
        const seed = x * 13 + y * 17;
        const random = (Math.sin(seed) + 1) / 2;

        // More gaps in middle, fewer on edges
        const distanceFromEdge = Math.min(x, y, this.size - 1 - x, this.size - 1 - y);
        const gapProbability = distanceFromEdge > 1 ? 0.15 : 0.05;

        return random < gapProbability;
    }

    /**
     * Get encounter type for a position based on difficulty gradient
     */
    getEncounterForPosition(x, y) {
        // Calculate distance from start (Manhattan distance)
        const distanceFromStart = Math.abs(x - this.startX) + Math.abs(y - this.startY);

        // Calculate distance from boss
        const distanceToBoss = Math.abs(x - this.bossX) + Math.abs(y - this.bossY);

        // Combined difficulty score (0-1, higher = harder)
        const maxDistance = (this.size - 1) * 2;
        const difficultyScore = distanceFromStart / maxDistance;

        // Add some randomness
        const seed = x * 11 + y * 19;
        const random = (Math.sin(seed * 2) + 1) / 2;
        const adjustedScore = difficultyScore * 0.7 + random * 0.3;

        // Map to difficulty
        let targetDifficulty;
        if (adjustedScore < 0.3) {
            targetDifficulty = Difficulty.EASY;
        } else if (adjustedScore < 0.6) {
            targetDifficulty = Difficulty.MEDIUM;
        } else {
            targetDifficulty = Difficulty.HARD;
        }

        // Filter encounters by difficulty
        const suitable = this.encounterTypes.filter(e =>
            e.difficulty === targetDifficulty && e.difficulty !== Difficulty.BOSS
        );

        // Fallback to any non-boss encounter
        if (suitable.length === 0) {
            const fallback = this.encounterTypes.filter(e => e.difficulty !== Difficulty.BOSS);
            return fallback[Math.floor(random * fallback.length)];
        }

        return suitable[Math.floor(random * suitable.length)];
    }

    /**
     * Get socket at position
     */
    getSocket(x, y) {
        return this.sockets.get(`socket-${x}-${y}`);
    }

    /**
     * Get adjacent positions (4-way: up, down, left, right)
     */
    getAdjacentPositions(x, y) {
        const adjacent = [];
        const directions = [
            { dx: 0, dy: -1 },  // up
            { dx: 0, dy: 1 },   // down
            { dx: -1, dy: 0 },  // left
            { dx: 1, dy: 0 }    // right
        ];

        for (const dir of directions) {
            const nx = x + dir.dx;
            const ny = y + dir.dy;
            if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size) {
                adjacent.push({ x: nx, y: ny });
            }
        }

        return adjacent;
    }

    /**
     * Reveal sockets adjacent to a given position
     */
    revealAdjacentSockets(x, y) {
        const adjacent = this.getAdjacentPositions(x, y);

        for (const pos of adjacent) {
            const socket = this.getSocket(pos.x, pos.y);
            if (socket && socket.state === SocketState.HIDDEN && !socket.isWall) {
                socket.state = SocketState.VISIBLE;
            }
        }
    }

    /**
     * Check if a socket can be unlocked
     */
    canUnlock(socket) {
        if (!socket || socket.state !== SocketState.VISIBLE) {
            return false;
        }

        // Must be adjacent to at least one traversable socket
        const adjacent = this.getAdjacentPositions(socket.x, socket.y);
        return adjacent.some(pos => {
            const adjSocket = this.getSocket(pos.x, pos.y);
            return adjSocket && adjSocket.isTraversable;
        });
    }

    /**
     * Unlock a socket (costs 1 MEM)
     */
    unlockSocket(socket) {
        if (!this.canUnlock(socket)) {
            return false;
        }

        socket.state = SocketState.UNLOCKED;
        this.revealAdjacentSockets(socket.x, socket.y);
        return true;
    }

    /**
     * Mark socket as won
     */
    winSocket(socket) {
        if (socket.state === SocketState.UNLOCKED) {
            socket.state = SocketState.WON;
            return true;
        }
        return false;
    }

    /**
     * Mark socket as failed
     */
    failSocket(socket) {
        if (socket.state === SocketState.UNLOCKED) {
            socket.state = SocketState.FAILED;
            return true;
        }
        return false;
    }

    /**
     * Get all visible sockets
     */
    getVisibleSockets() {
        return Array.from(this.sockets.values()).filter(s => s.state === SocketState.VISIBLE);
    }

    /**
     * Get all unlocked/active sockets
     */
    getUnlockedSockets() {
        return Array.from(this.sockets.values()).filter(s => s.state === SocketState.UNLOCKED);
    }

    /**
     * Get all sockets (for rendering)
     */
    getAllSockets() {
        return Array.from(this.sockets.values());
    }
}
