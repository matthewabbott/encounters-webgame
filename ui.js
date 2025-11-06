import { CategoryInfo } from './encounters.js';

/**
 * UI Manager class - handles all UI rendering and interactions
 */
class UI {
    constructor(game) {
        this.game = game;
        this.initializeElements();
        this.attachEventListeners();
    }

    initializeElements() {
        // Main elements
        this.encountersContainer = document.getElementById('encounters-container');
        this.emptyState = document.getElementById('empty-state');
        this.runProgressEl = document.getElementById('run-progress');
        this.deckCountEl = document.getElementById('deck-count');
        this.activeEncountersEl = document.getElementById('active-encounters');
        this.deckContentsEl = document.getElementById('deck-contents');

        // Progress elements
        this.bossCountdownEl = document.getElementById('boss-countdown');
        this.countdownValueEl = this.bossCountdownEl.querySelector('.countdown-value');
        this.upcomingEncountersEl = document.getElementById('upcoming-encounters');

        // Map elements
        this.mapViewport = document.getElementById('map-viewport');
        this.mapCanvas = document.getElementById('map-canvas');
        this.mapConnections = document.getElementById('map-connections');
        this.mapSlots = document.getElementById('map-slots');

        // Encounter hand elements
        this.encounterHandEl = document.getElementById('encounter-hand');
        this.encounterDeckCountEl = document.getElementById('encounter-deck-count');

        // Map state
        this.mapState = {
            panX: 100,
            panY: 100,
            scale: 1,
            isDragging: false,
            dragStartX: 0,
            dragStartY: 0,
            panStartX: 0,
            panStartY: 0,
            nextZIndex: 100, // For managing encounter stacking order
            selectedSlotId: null, // For encounter placement
            tutorialShown: false, // Track if tutorial popup has been shown
            // Slot dragging
            isDraggingSlot: false,
            draggedSlotId: null,
            slotDragStartX: 0,
            slotDragStartY: 0,
            slotOriginalX: 0,
            slotOriginalY: 0,
            // Performance
            redrawScheduled: false
        };

        // Apply initial transform
        this.updateMapTransform();

        // Initialize map slots
        this.initializeMapSlots();

        // Templates
        this.encounterTemplate = document.getElementById('encounter-template');
        this.cardTemplate = document.getElementById('card-template');

        // Generate initial upcoming encounters
        this.upcomingEncounterOptions = [];

        // Update initial state
        this.updateGameStats();
    }

    initializeMapSlots() {
        // Procedural slot generation - start with first slot and generate more as needed
        this.slots = [];
        this.nextSlotId = 0;
        this.slotSpacing = 280; // Base horizontal spacing between slot columns

        // Spatial grid system for collision detection
        this.slotSize = 120; // Slot visual size
        this.slotPadding = 40; // Minimum padding between slots
        this.gridCellSize = 60; // Grid cell size (half of slot size)
        this.spatialGrid = new Map(); // Maps "x,y" grid cell to slot ID

        // Define fixed Y "lanes" for slots to snap to
        // Each slot needs 120px + 40px*2 padding = 200px vertical space
        // So lanes must be spaced at least 200px apart (using 220px for safety)
        this.slotLanes = [250, 470, 690]; // 220px spacing between lanes (supports 3 branches)

        // Track which lanes are occupied at each X column
        // Format: { x: Set(lanes) }
        this.occupiedLanes = new Map();

        // Track parent Y positions for horizontal staggering
        // Format: { x: [parentY1, parentY2, ...] }
        this.parentYAtColumn = new Map();

        // Create the starting slot at top lane
        this.createSlot(0, 200, 250, 'unlocked');

        // Draw initial connections
        this.drawAllConnections();
    }

    // Convert world coordinates to grid coordinates
    worldToGrid(x, y) {
        return {
            gridX: Math.floor(x / this.gridCellSize),
            gridY: Math.floor(y / this.gridCellSize)
        };
    }

    // Get grid cell range that a slot would occupy (helper to avoid duplication)
    getGridRange(x, y) {
        const cellsWide = Math.ceil((this.slotSize + this.slotPadding * 2) / this.gridCellSize);
        const centerGrid = this.worldToGrid(x, y);
        const halfCells = Math.floor(cellsWide / 2);

        return {
            minGx: centerGrid.gridX - halfCells,
            maxGx: centerGrid.gridX + halfCells,
            minGy: centerGrid.gridY - halfCells,
            maxGy: centerGrid.gridY + halfCells
        };
    }

    // Check if a slot can be placed at the given position
    canPlaceSlot(x, y, excludeSlotId = null) {
        const range = this.getGridRange(x, y);

        // Check all cells that would be occupied
        for (let gx = range.minGx; gx <= range.maxGx; gx++) {
            for (let gy = range.minGy; gy <= range.maxGy; gy++) {
                const key = `${gx},${gy}`;
                const occupyingSlotId = this.spatialGrid.get(key);

                if (occupyingSlotId !== undefined && occupyingSlotId !== excludeSlotId) {
                    return false; // Cell is occupied by another slot
                }
            }
        }

        return true; // All cells are free
    }

    // Mark grid cells as occupied by a slot
    occupyGridCells(x, y, slotId) {
        const range = this.getGridRange(x, y);

        for (let gx = range.minGx; gx <= range.maxGx; gx++) {
            for (let gy = range.minGy; gy <= range.maxGy; gy++) {
                const key = `${gx},${gy}`;
                this.spatialGrid.set(key, slotId);
            }
        }
    }

    // Free grid cells occupied by a slot
    freeGridCells(x, y) {
        const range = this.getGridRange(x, y);

        for (let gx = range.minGx; gx <= range.maxGx; gx++) {
            for (let gy = range.minGy; gy <= range.maxGy; gy++) {
                const key = `${gx},${gy}`;
                this.spatialGrid.delete(key);
            }
        }
    }

    createSlot(id, x, y, status = 'locked') {
        // Check if slot already exists
        if (this.slots.find(s => s.id === id)) {
            return this.slots.find(s => s.id === id);
        }

        const slot = {
            id: id,
            x: x,
            y: y,
            status: status,
            encounterId: null,
            unlockData: [] // Store unlock info: [{id, x, y}, ...]
        };

        this.slots.push(slot);

        // Mark this lane as occupied at this X position
        if (!this.occupiedLanes.has(x)) {
            this.occupiedLanes.set(x, new Set());
        }
        this.occupiedLanes.get(x).add(y);

        // Mark spatial grid cells as occupied
        this.occupyGridCells(x, y, id);

        // Create DOM element
        const slotEl = document.createElement('div');
        slotEl.className = `map-slot ${slot.status}`;
        slotEl.style.left = `${slot.x}px`;
        slotEl.style.top = `${slot.y}px`;
        slotEl.setAttribute('data-slot-id', slot.id);

        slotEl.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleSlotClick(slot.id);
        });

        slotEl.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.handleSlotDragStart(e, slot.id);
        });

        this.mapSlots.appendChild(slotEl);

        // Generate unlock data for this slot (but don't create slots yet)
        this.generateUnlockDataForSlot(slot);

        // Update next slot ID
        if (id >= this.nextSlotId) {
            this.nextSlotId = id + 1;
        }

        return slot;
    }

    generateUnlockDataForSlot(slot) {
        // Each slot defines 1-3 new slots that will unlock
        const numUnlocks = Math.floor(Math.random() * 3) + 1; // 1-3 unlocks

        // Calculate base X position with horizontal staggering
        let nextX = slot.x + this.slotSpacing;

        // Track parent Y positions at parent column for staggering
        if (!this.parentYAtColumn.has(slot.x)) {
            this.parentYAtColumn.set(slot.x, []);
        }
        const parentsAtThisColumn = this.parentYAtColumn.get(slot.x);

        // If other slots at this X have already generated children, stagger horizontally
        if (parentsAtThisColumn.length > 0) {
            // Stagger based on how many parents exist at this column
            const staggerIndex = parentsAtThisColumn.length;
            nextX += (staggerIndex % 3 - 1) * 40; // Stagger by -40, 0, +40
        }

        parentsAtThisColumn.push(slot.y);

        // Determine preferred lanes based on parent position
        const parentLaneIndex = this.findNearestLaneIndex(slot.y);
        let preferredLanes = [];

        if (numUnlocks === 1) {
            // Single unlock - prefer same lane or adjacent
            preferredLanes = [parentLaneIndex, parentLaneIndex - 1, parentLaneIndex + 1];
        } else if (numUnlocks === 2) {
            // Two unlocks - prefer lanes above and below parent
            preferredLanes = [parentLaneIndex - 1, parentLaneIndex + 1, parentLaneIndex - 2, parentLaneIndex + 2];
        } else {
            // Three unlocks - spread across lanes
            preferredLanes = [
                parentLaneIndex - 1,
                parentLaneIndex,
                parentLaneIndex + 1,
                parentLaneIndex - 2,
                parentLaneIndex + 2
            ];
        }

        // Get available lanes at the target X position
        const availableLanes = this.getAvailableLanes(nextX);

        // Assign unlocks to lanes
        for (let i = 0; i < numUnlocks; i++) {
            const nextId = this.nextSlotId++;

            // Find best available lane from preferred list
            let chosenLane = null;
            for (const laneIndex of preferredLanes) {
                if (laneIndex >= 0 && laneIndex < this.slotLanes.length) {
                    const laneY = this.slotLanes[laneIndex];
                    if (availableLanes.includes(laneY)) {
                        chosenLane = laneY;
                        // Mark as taken for this generation cycle
                        availableLanes.splice(availableLanes.indexOf(laneY), 1);
                        break;
                    }
                }
            }

            // If no preferred lane available, use any available lane
            if (chosenLane === null && availableLanes.length > 0) {
                chosenLane = availableLanes[0];
                availableLanes.splice(0, 1);
            }

            // If still no lane (all occupied), use fallback position
            if (chosenLane === null) {
                chosenLane = this.slotLanes[Math.floor(this.slotLanes.length / 2)];
                console.warn(`No available lane at x=${nextX}, using fallback`);
            }

            // Find a valid position - try multiple strategies to avoid killing player's run
            let finalX = nextX;
            let finalY = chosenLane;
            let positionFound = false;

            // Strategy 1: Try chosen lane at base X
            if (this.canPlaceSlot(finalX, finalY)) {
                positionFound = true;
            }

            // Strategy 2: Try all lanes at this X
            if (!positionFound) {
                for (const laneY of this.slotLanes) {
                    if (this.canPlaceSlot(finalX, laneY)) {
                        finalY = laneY;
                        positionFound = true;
                        break;
                    }
                }
            }

            // Strategy 3: Try horizontal offsets (stagger more)
            if (!positionFound) {
                for (let xOffset of [-80, 80, -120, 120, -160, 160]) {
                    const testX = nextX + xOffset;
                    for (const laneY of this.slotLanes) {
                        if (this.canPlaceSlot(testX, laneY)) {
                            finalX = testX;
                            finalY = laneY;
                            positionFound = true;
                            break;
                        }
                    }
                    if (positionFound) break;
                }
            }

            // Strategy 4: Try much larger horizontal offsets (aggressive search)
            if (!positionFound) {
                for (let xOffset of [-240, 240, -320, 320, -400, 400]) {
                    const testX = nextX + xOffset;
                    for (const laneY of this.slotLanes) {
                        if (this.canPlaceSlot(testX, laneY)) {
                            finalX = testX;
                            finalY = laneY;
                            positionFound = true;
                            console.log(`Found position with aggressive offset: (${finalX}, ${finalY})`);
                            break;
                        }
                    }
                    if (positionFound) break;
                }
            }

            // Strategy 5: Try farther forward (skip a column)
            if (!positionFound) {
                const farX = nextX + this.slotSpacing;
                for (const laneY of this.slotLanes) {
                    if (this.canPlaceSlot(farX, laneY)) {
                        finalX = farX;
                        finalY = laneY;
                        positionFound = true;
                        console.log(`Found position by skipping ahead: (${finalX}, ${finalY})`);
                        break;
                    }
                }
            }

            // If still no valid position found, SKIP this slot (don't place invalid)
            if (!positionFound) {
                console.error(`CRITICAL: Cannot find valid position for slot ${nextId} near (${nextX}, ${chosenLane})`);
                console.error('Skipping slot generation to prevent overlap. Consider increasing map size or slot spacing.');
                this.nextSlotId--; // Return the ID since we didn't use it
                continue; // Skip this unlock, don't add it
            }

            // Add the unlock (only if valid position found)
            slot.unlockData.push({
                id: nextId,
                x: finalX,
                y: finalY
            });

            // Reserve this position
            if (!this.occupiedLanes.has(finalX)) {
                this.occupiedLanes.set(finalX, new Set());
            }
            this.occupiedLanes.get(finalX).add(finalY);
        }
    }

    findNearestLaneIndex(y) {
        // Find the index of the lane nearest to the given Y position
        let nearestIndex = 0;
        let minDistance = Math.abs(y - this.slotLanes[0]);

        for (let i = 1; i < this.slotLanes.length; i++) {
            const distance = Math.abs(y - this.slotLanes[i]);
            if (distance < minDistance) {
                minDistance = distance;
                nearestIndex = i;
            }
        }

        return nearestIndex;
    }

    getAvailableLanes(x) {
        // Get list of lanes not occupied at this X position
        const occupied = this.occupiedLanes.get(x) || new Set();
        return this.slotLanes.filter(lane => !occupied.has(lane));
    }

    validateAndRecoverGridState() {
        // Rebuild occupiedLanes from actual slot positions to fix desync
        console.log('Validating grid state...');

        const newOccupiedLanes = new Map();
        let mismatchCount = 0;

        // Rebuild from actual slot positions
        for (const slot of this.slots) {
            const colX = slot.x;
            const laneY = slot.y;

            if (!newOccupiedLanes.has(colX)) {
                newOccupiedLanes.set(colX, new Set());
            }
            newOccupiedLanes.get(colX).add(laneY);

            // Verify spatial grid is also correct
            const centerGrid = this.worldToGrid(colX, laneY);
            const key = `${centerGrid.gridX},${centerGrid.gridY}`;
            if (this.spatialGrid.get(key) !== slot.id) {
                console.warn(`Spatial grid mismatch at slot ${slot.id} (${colX}, ${laneY}), rebuilding...`);
                mismatchCount++;
                // Re-occupy in spatial grid
                this.freeGridCells(colX, laneY);
                this.occupyGridCells(colX, laneY, slot.id);
            }
        }

        // Check if recovery is needed
        const oldSize = Array.from(this.occupiedLanes.values()).reduce((sum, set) => sum + set.size, 0);
        const newSize = Array.from(newOccupiedLanes.values()).reduce((sum, set) => sum + set.size, 0);

        if (oldSize !== newSize || mismatchCount > 0) {
            console.warn(`Grid state recovered: ${oldSize} -> ${newSize} entries, ${mismatchCount} spatial grid fixes`);
            this.occupiedLanes = newOccupiedLanes;
            return true; // State was recovered
        }

        console.log('Grid state OK');
        return false; // No recovery needed
    }

    drawConnectionLine(parentSlot, childX, childY, unlocked = false) {
        // Draw orthogonal line from parent to child slot
        // Path: start -> right to midpoint -> down/up to child -> right to child
        const startX = parentSlot.x;
        const startY = parentSlot.y;
        const endX = childX;
        const endY = childY;

        // Calculate midpoint X (halfway between parent and child)
        const midX = startX + (endX - startX) * 0.5;

        // Snap path to 40px grid for circuit board aesthetic
        const gridSize = 40;
        const snapToGrid = (val) => Math.round(val / gridSize) * gridSize;

        const mid1X = snapToGrid(midX);

        // Create SVG path with orthogonal routing
        let path = `M ${startX},${startY} `;  // Start at parent center
        path += `L ${mid1X},${startY} `;       // Go right to midpoint
        path += `L ${mid1X},${endY} `;         // Go down/up to child Y
        path += `L ${endX},${endY}`;           // Go right to child

        // Create path element
        const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathElement.setAttribute('d', path);
        pathElement.setAttribute('class', `connection-line ${unlocked ? 'unlocked' : ''}`);
        pathElement.setAttribute('data-parent', parentSlot.id);
        pathElement.setAttribute('data-child', `${childX},${childY}`);

        this.mapConnections.appendChild(pathElement);
    }

    drawAllConnections() {
        // Clear existing connections
        this.mapConnections.innerHTML = '';

        // Draw lines for all existing slots
        for (const slot of this.slots) {
            if (slot.unlockData && slot.unlockData.length > 0) {
                for (const unlock of slot.unlockData) {
                    // Check if child slot exists (has been created)
                    const childSlot = this.slots.find(s => s.id === unlock.id);
                    const isUnlocked = childSlot && childSlot.status === 'unlocked';

                    this.drawConnectionLine(slot, unlock.x, unlock.y, isUnlocked);
                }
            }
        }
    }

    handleSlotClick(slotId) {
        const slot = this.slots.find(s => s.id === slotId);
        if (!slot) return;

        // Only allow clicking unlocked empty slots
        if (slot.status !== 'unlocked' || slot.encounterId !== null) {
            return;
        }

        // If a card is selected from hand, play it
        if (this.mapState.selectedHandIndex !== null) {
            const result = this.game.playEncounterFromHand(this.mapState.selectedHandIndex, slotId);
            if (result) {
                this.clearSlotSelection();
                this.mapState.tutorialShown = true;
            }
        } else {
            // No card selected - prompt to select from hand (only first time)
            if (!this.mapState.tutorialShown) {
                this.game.ui.showNotification('Select an Encounter', 'Click a card from your hand at the bottom of the screen to place it here.', '💡');
            }
        }
    }

    getAvailableSlot() {
        // Find first unlocked slot without an encounter
        return this.slots.find(slot => slot.status === 'unlocked' && slot.encounterId === null);
    }

    assignEncounterToSlot(encounter) {
        const slot = this.getAvailableSlot();
        if (slot) {
            slot.encounterId = encounter.id;
            encounter.slotId = slot.id;
            return slot;
        }
        return null;
    }

    unlockSlotsFromSlot(slotId) {
        // Validate grid state before creating new slots
        this.validateAndRecoverGridState();

        // Find the slot that was completed
        const completedSlot = this.slots.find(s => s.id === slotId);
        if (!completedSlot || !completedSlot.unlockData) return;

        // Create and unlock new slots based on unlock data
        completedSlot.unlockData.forEach(unlockInfo => {
            // Check if slot already exists
            let slot = this.slots.find(s => s.id === unlockInfo.id);

            if (!slot) {
                // Create new slot with unlocked status
                slot = this.createSlot(unlockInfo.id, unlockInfo.x, unlockInfo.y, 'unlocked');
            } else if (slot.status === 'locked') {
                // Unlock existing slot
                slot.status = 'unlocked';
                const slotEl = document.querySelector(`[data-slot-id="${unlockInfo.id}"]`);
                if (slotEl) {
                    slotEl.classList.remove('locked');
                    slotEl.classList.add('unlocked');
                }
            }
        });

        // Redraw connections to show unlocked status
        this.drawAllConnections();
    }

    attachEventListeners() {
        // New encounter button - show selection screen
        document.getElementById('new-encounter-btn').addEventListener('click', () => {
            this.game.showEncounterSelection();
        });

        // Reset game button
        document.getElementById('reset-game-btn').addEventListener('click', () => {
            this.game.resetGame();
        });

        // Map pan controls
        this.mapViewport.addEventListener('mousedown', (e) => this.handleMapMouseDown(e));
        this.mapViewport.addEventListener('mousemove', (e) => this.handleMapMouseMove(e));
        this.mapViewport.addEventListener('mouseup', (e) => this.handleMapMouseUp(e));
        this.mapViewport.addEventListener('mouseleave', (e) => this.handleMapMouseUp(e));

        // Map zoom controls
        this.mapViewport.addEventListener('wheel', (e) => this.handleMapWheel(e), { passive: false });
    }

    updateGameStats() {
        // Update run progress
        const progress = this.game.getRunProgress();
        this.runProgressEl.textContent = `${progress.cleared}/${progress.needed}`;
        if (progress.bossAvailable && !progress.bossDefeated) {
            this.runProgressEl.classList.add('boss-ready');
        } else {
            this.runProgressEl.classList.remove('boss-ready');
        }

        // Update boss countdown
        const remaining = Math.max(0, progress.needed - progress.cleared);
        this.countdownValueEl.textContent = remaining;

        if (progress.bossAvailable && !progress.bossDefeated) {
            this.bossCountdownEl.classList.add('boss-ready');
            this.countdownValueEl.textContent = 'READY!';
        } else {
            this.bossCountdownEl.classList.remove('boss-ready');
        }

        // Update upcoming encounters preview
        this.updateUpcomingEncounters();

        this.deckCountEl.textContent = this.game.getDeckSize();
        this.activeEncountersEl.textContent = this.game.getActiveEncounterCount();

        // Update deck contents display
        const contents = this.game.getDeckContents();
        if (contents.length > 0) {
            this.deckContentsEl.textContent = `Remaining: ${contents.slice(0, 20).join(', ')}${contents.length > 20 ? '...' : ''}`;
        } else {
            this.deckContentsEl.textContent = 'Deck is empty!';
        }

        // Show/hide empty state
        if (this.game.getActiveEncounterCount() === 0) {
            this.emptyState.style.display = 'block';
            this.encountersContainer.style.display = 'none';
        } else {
            this.emptyState.style.display = 'none';
            this.encountersContainer.style.display = 'grid';
        }
    }

    updateEncounterHand() {
        // Clear current hand display
        this.encounterHandEl.innerHTML = '';

        // Update deck count
        this.encounterDeckCountEl.textContent = this.game.encounterDeck.length;

        // Render each card in hand
        this.game.encounterHand.forEach((encounterType, index) => {
            const cardEl = document.createElement('div');
            cardEl.className = `encounter-card difficulty-${encounterType.difficulty}`;
            cardEl.setAttribute('data-hand-index', index);

            const categoryData = CategoryInfo[encounterType.category];
            const categoryIcon = categoryData ? categoryData.icon : '?';

            cardEl.innerHTML = `
                <div class="encounter-card-header">
                    <div class="encounter-card-category" style="color: ${this.getCategoryColor(encounterType.category)}">${categoryIcon}</div>
                    <div class="encounter-card-difficulty">${encounterType.difficulty}</div>
                </div>
                <div class="encounter-card-name">${encounterType.name}</div>
                <div class="encounter-card-description">${encounterType.description}</div>
            `;

            // Add click handler
            cardEl.addEventListener('click', () => {
                this.handleEncounterCardClick(index);
            });

            this.encounterHandEl.appendChild(cardEl);
        });
    }

    getCategoryColor(category) {
        const colors = {
            'sum': '#f39c12',
            'sequence': '#3498db',
            'collection': '#9b59b6',
            'duel': '#e74c3c',
            'multi-stage': '#1abc9c',
            'simple': '#95a5a6',
            'hybrid': '#e67e22'
        };
        return colors[category] || '#fff';
    }

    handleEncounterCardClick(handIndex) {
        // If a slot is selected, play the encounter there
        if (this.mapState.selectedSlotId !== null) {
            const result = this.game.playEncounterFromHand(handIndex, this.mapState.selectedSlotId);
            if (result) {
                // Clear selection
                this.clearSlotSelection();
                this.mapState.tutorialShown = true;
            }
        } else {
            // No slot selected - prompt user to select a slot (only first time)
            if (!this.mapState.tutorialShown) {
                this.game.ui.showNotification('Select a Slot', 'Click an unlocked slot on the map to place this encounter.', '💡');
            }

            // Highlight the selected card
            const cards = this.encounterHandEl.querySelectorAll('.encounter-card');
            cards.forEach((card, i) => {
                if (i === handIndex) {
                    card.classList.add('selected-for-slot');
                } else {
                    card.classList.remove('selected-for-slot');
                }
            });

            // Store which card was selected (for future: could show this in UI)
            this.mapState.selectedHandIndex = handIndex;
        }
    }

    clearSlotSelection() {
        this.mapState.selectedSlotId = null;
        this.mapState.selectedHandIndex = null;

        // Remove selection highlighting from cards
        const cards = this.encounterHandEl.querySelectorAll('.encounter-card');
        cards.forEach(card => card.classList.remove('selected-for-slot'));

        // Remove selection highlighting from slots (add this later)
    }

    updateUpcomingEncounters() {
        // Use pre-generated next encounter options
        const options = this.game.nextEncounterOptions;
        this.upcomingEncountersEl.innerHTML = '';

        options.forEach((encounterType, index) => {
            const cardEl = document.createElement('div');
            cardEl.className = `encounter-card-preview difficulty-${encounterType.difficulty}`;

            // Stack cards with offset
            const offset = index * 15; // 15px offset per card
            cardEl.style.transform = `translateX(${offset}px)`;
            cardEl.style.zIndex = options.length - index; // Boss on bottom (lowest z-index)

            cardEl.innerHTML = `
                <div>${encounterType.difficulty.toUpperCase()}</div>
                <div class="preview-type">${encounterType.name}</div>
            `;

            this.upcomingEncountersEl.appendChild(cardEl);
        });
    }

    renderEncounter(encounter) {
        let encounterEl = document.querySelector(`[data-encounter-id="${encounter.id}"]`);

        if (!encounterEl) {
            // Assign encounter to slot if not already assigned
            if (encounter.slotId === null) {
                const slot = this.assignEncounterToSlot(encounter);
                if (!slot) {
                    console.error('No available slot for encounter!');
                    return;
                }
            }

            // Create new encounter element
            encounterEl = this.encounterTemplate.content.cloneNode(true).querySelector('.encounter');
            encounterEl.setAttribute('data-encounter-id', encounter.id);
            encounterEl.classList.add(`difficulty-${encounter.type.difficulty}`);
            encounterEl.classList.add('encounter-on-map');

            // Position at slot coordinates
            const slot = this.slots.find(s => s.id === encounter.slotId);
            if (slot) {
                encounterEl.style.left = `${slot.x}px`;
                encounterEl.style.top = `${slot.y}px`;
            }

            // Set initial z-index
            encounterEl.style.zIndex = this.mapState.nextZIndex++;

            // Add click handler to bring to front
            encounterEl.addEventListener('mousedown', (e) => {
                // Don't trigger if clicking a button or card
                if (e.target.closest('button') || e.target.closest('.card')) {
                    return;
                }
                encounterEl.style.zIndex = this.mapState.nextZIndex++;
            });

            this.encountersContainer.appendChild(encounterEl);

            // Attach encounter-specific event listeners
            this.attachEncounterListeners(encounterEl, encounter.id);
        }

        // Update encounter state classes
        encounterEl.classList.remove('completed', 'failed', 'locked', 'rewards-available');
        const statusEl = encounterEl.querySelector('.encounter-status');

        if (encounter.completed) {
            encounterEl.classList.add('completed');
            if (!encounter.rewardsCollected) {
                encounterEl.classList.add('rewards-available');
            }
            statusEl.textContent = '✓ COMPLETE';
            statusEl.className = 'encounter-status status-complete';
        } else if (encounter.failed) {
            encounterEl.classList.add('failed', 'locked');
            statusEl.textContent = '🔒 LOCKED';
            statusEl.className = 'encounter-status status-locked';
        } else {
            statusEl.textContent = '';
            statusEl.className = 'encounter-status';
        }

        // Update minimized state
        if (encounter.minimized) {
            encounterEl.classList.add('minimized');
        } else {
            encounterEl.classList.remove('minimized');
        }

        // Update minimize button text
        const minimizeBtn = encounterEl.querySelector('.minimize-btn');
        if (minimizeBtn) {
            minimizeBtn.textContent = encounter.minimized ? '+' : '−';
            minimizeBtn.title = encounter.minimized ? 'Expand' : 'Minimize';
        }

        // Update header
        encounterEl.querySelector('.encounter-title').textContent = encounter.type.name;
        encounterEl.querySelector('.encounter-type').textContent = encounter.type.name.toUpperCase();

        // Update category badge
        const categoryBadge = encounterEl.querySelector('.category-badge');
        const categoryData = CategoryInfo[encounter.type.category];
        if (categoryData) {
            categoryBadge.textContent = categoryData.icon;
            categoryBadge.title = `${categoryData.name}: ${categoryData.description}`;
            categoryBadge.setAttribute('data-category', encounter.type.category);
        }

        // Update objective
        encounterEl.querySelector('.encounter-objective').textContent = encounter.type.description;

        // Update progress
        encounterEl.querySelector('.encounter-progress').textContent = encounter.getProgress();

        // Render hand
        this.renderHand(encounterEl, encounter);

        // Update buttons
        const completeBtn = encounterEl.querySelector('.complete-btn');
        const drawBtn = encounterEl.querySelector('.draw-btn');
        const abandonBtn = encounterEl.querySelector('.abandon-btn');

        if (encounter.completed) {
            completeBtn.style.display = 'inline-block';
            if (encounter.rewardsCollected) {
                completeBtn.textContent = 'Rewards Collected';
                completeBtn.disabled = true;
            } else {
                completeBtn.textContent = 'Collect Rewards';
                completeBtn.disabled = false;
            }
            drawBtn.disabled = true;
            abandonBtn.style.display = 'none';
        } else if (encounter.failed) {
            completeBtn.style.display = 'none';
            drawBtn.disabled = true;
            abandonBtn.disabled = true;
            abandonBtn.textContent = 'Locked';
            abandonBtn.style.display = 'inline-block';
        } else {
            completeBtn.style.display = 'none';
            drawBtn.disabled = false;
            abandonBtn.disabled = false;
            abandonBtn.textContent = 'Abandon';
            abandonBtn.style.display = 'inline-block';
        }
    }

    renderHand(encounterEl, encounter) {
        const cardsContainer = encounterEl.querySelector('.cards-container');

        // Create a combined list of all cards with their state
        const allCards = [
            ...encounter.hand.map(card => ({ card, played: false })),
            ...encounter.playedCards.map(card => ({ card, played: true }))
        ];

        // Update existing cards or create new ones
        const existingCards = Array.from(cardsContainer.querySelectorAll('.card'));

        // Remove cards that no longer exist
        existingCards.forEach(cardEl => {
            const cardId = cardEl.getAttribute('data-card-id');
            const stillExists = allCards.some(item => item.card.id === cardId);
            if (!stillExists) {
                cardEl.remove();
            }
        });

        // Add or update cards
        allCards.forEach((item) => {
            let cardEl = cardsContainer.querySelector(`[data-card-id="${item.card.id}"]`);

            if (!cardEl) {
                // Create new card
                cardEl = this.createCardElement(item.card, item.played);
                if (!item.played && !encounter.completed && !encounter.failed) {
                    cardEl.addEventListener('click', () => {
                        this.game.playCardInEncounter(encounter.id, item.card.id);
                    });
                }
                cardsContainer.appendChild(cardEl);
            } else {
                // Update existing card's played state
                if (item.played) {
                    cardEl.classList.add('played');
                } else {
                    cardEl.classList.remove('played');
                }
            }
        });
    }

    createCardElement(card, played = false) {
        const cardEl = this.cardTemplate.content.cloneNode(true).querySelector('.card');
        cardEl.setAttribute('data-card-id', card.id);
        cardEl.classList.add(card.color);

        if (played) {
            cardEl.classList.add('played');
        }

        cardEl.querySelector('.card-rank').textContent = card.rank;
        cardEl.querySelector('.card-suit').textContent = card.suit;

        return cardEl;
    }

    attachEncounterListeners(encounterEl, encounterId) {
        // Minimize button
        encounterEl.querySelector('.minimize-btn').addEventListener('click', (e) => {
            e.stopPropagation(); // Don't trigger z-index reordering
            this.game.toggleEncounterMinimize(encounterId);
        });

        // Draw card button
        encounterEl.querySelector('.draw-btn').addEventListener('click', () => {
            this.game.drawCardForEncounter(encounterId);
        });

        // Complete button
        encounterEl.querySelector('.complete-btn').addEventListener('click', () => {
            this.game.completeEncounter(encounterId);
        });

        // Abandon button
        encounterEl.querySelector('.abandon-btn').addEventListener('click', () => {
            this.game.abandonEncounter(encounterId);
        });
    }

    removeEncounter(encounterId, slotId = null) {
        const encounterEl = document.querySelector(`[data-encounter-id="${encounterId}"]`);
        if (encounterEl) {
            encounterEl.remove();
        }

        // Free the slot
        if (slotId !== null) {
            const slot = this.slots.find(s => s.id === slotId);
            if (slot) {
                slot.encounterId = null;
            }
        }

        this.updateGameStats();
    }

    showEncounterSelection(encounterOptions) {
        // Create and show modal with 3 encounter options
        const modal = document.getElementById('encounter-selection-modal');
        const optionsContainer = document.getElementById('encounter-options');

        // Clear previous options
        optionsContainer.innerHTML = '';

        // Create option cards
        encounterOptions.forEach((encounterType, index) => {
            const optionEl = document.createElement('div');
            optionEl.className = `encounter-option difficulty-${encounterType.difficulty}`;
            optionEl.innerHTML = `
                <div class="option-header">
                    <h3>${encounterType.name}</h3>
                    <span class="difficulty-badge">${encounterType.difficulty.toUpperCase()}</span>
                </div>
                <p class="option-description">${encounterType.description}</p>
                <p class="option-details">Initial hand: ${encounterType.initialHandSize} cards</p>
                <button class="btn btn-primary select-encounter-btn">Select</button>
            `;

            // Add click handler
            optionEl.querySelector('.select-encounter-btn').addEventListener('click', () => {
                this.game.startNewEncounter(encounterType);
                this.hideEncounterSelection();
            });

            optionsContainer.appendChild(optionEl);
        });

        // Show modal
        modal.style.display = 'flex';
    }

    hideEncounterSelection() {
        const modal = document.getElementById('encounter-selection-modal');
        modal.style.display = 'none';
    }

    showRewardSelection(encounterId, rewardCards, difficulty) {
        const modal = document.getElementById('reward-selection-modal');
        const titleEl = document.getElementById('reward-title');
        const descEl = document.getElementById('reward-description');
        const cardsContainer = document.getElementById('reward-cards');

        // Update title and description based on difficulty
        if (difficulty === 'easy') {
            titleEl.textContent = '🎁 Reward Earned!';
            descEl.textContent = 'You received a new card!';
        } else if (difficulty === 'medium') {
            titleEl.textContent = '🎁 Select Your Reward';
            descEl.textContent = 'Choose 1 card to add to your deck:';
        } else if (difficulty === 'hard') {
            titleEl.textContent = '🎁 Select Your Reward';
            descEl.textContent = 'Choose 1 card to add to your deck:';
        } else if (difficulty === 'boss') {
            titleEl.textContent = '🏆 VICTORY REWARD!';
            descEl.textContent = 'Choose 1 powerful card to add to your deck:';
        }

        // Clear previous cards
        cardsContainer.innerHTML = '';

        // Create reward card elements
        rewardCards.forEach((card) => {
            const cardEl = this.createRewardCardElement(card);
            cardEl.addEventListener('click', () => {
                this.game.finalizeEncounterCompletion(encounterId, [card]);
                this.hideRewardSelection();
            });
            cardsContainer.appendChild(cardEl);
        });

        // Show modal
        modal.style.display = 'flex';
    }

    createRewardCardElement(card) {
        const cardEl = document.createElement('div');
        cardEl.className = `reward-card ${card.color}`;
        cardEl.innerHTML = `
            <div class="reward-card-rank">${card.rank}</div>
            <div class="reward-card-suit">${card.suit}</div>
            <div class="reward-card-value">Value: ${card.value}</div>
        `;
        return cardEl;
    }

    hideRewardSelection() {
        const modal = document.getElementById('reward-selection-modal');
        modal.style.display = 'none';
    }

    showNotification(title, message, icon = '💬') {
        const modal = document.getElementById('notification-modal');
        const iconEl = document.getElementById('notification-icon');
        const titleEl = document.getElementById('notification-title');
        const messageEl = document.getElementById('notification-message');
        const okBtn = document.getElementById('notification-ok-btn');

        iconEl.textContent = icon;
        titleEl.textContent = title;
        messageEl.textContent = message;

        // Remove any existing event listeners
        const newOkBtn = okBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOkBtn, okBtn);

        newOkBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        modal.style.display = 'flex';
    }

    showConfirmation(title, message, onConfirm) {
        const modal = document.getElementById('confirmation-modal');
        const titleEl = document.getElementById('confirmation-title');
        const messageEl = document.getElementById('confirmation-message');
        const yesBtn = document.getElementById('confirmation-yes-btn');
        const noBtn = document.getElementById('confirmation-no-btn');

        titleEl.textContent = title;
        messageEl.textContent = message;

        // Remove any existing event listeners by cloning
        const newYesBtn = yesBtn.cloneNode(true);
        const newNoBtn = noBtn.cloneNode(true);
        yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);
        noBtn.parentNode.replaceChild(newNoBtn, noBtn);

        newYesBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            onConfirm(true);
        });

        newNoBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            onConfirm(false);
        });

        modal.style.display = 'flex';
    }

    // Map interaction methods
    handleMapMouseDown(e) {
        // Don't start drag if clicking on an encounter, button, or slot
        if (e.target.closest('.encounter') || e.target.closest('button') || e.target.closest('.map-slot')) {
            return;
        }

        this.mapState.isDragging = true;
        this.mapState.dragStartX = e.clientX;
        this.mapState.dragStartY = e.clientY;
        this.mapState.panStartX = this.mapState.panX;
        this.mapState.panStartY = this.mapState.panY;
    }

    handleMapMouseMove(e) {
        // Handle slot dragging
        if (this.mapState.isDraggingSlot) {
            this.handleSlotDragMove(e);
            return;
        }

        // Handle map panning
        if (!this.mapState.isDragging) return;

        const dx = e.clientX - this.mapState.dragStartX;
        const dy = e.clientY - this.mapState.dragStartY;

        this.mapState.panX = this.mapState.panStartX + dx;
        this.mapState.panY = this.mapState.panStartY + dy;

        this.updateMapTransform();
    }

    handleMapMouseUp(e) {
        // Finalize slot drag
        if (this.mapState.isDraggingSlot) {
            this.handleSlotDragEnd(e);
        }

        this.mapState.isDragging = false;
    }

    handleSlotDragStart(e, slotId) {
        const slot = this.slots.find(s => s.id === slotId);
        if (!slot) return;

        this.mapState.isDraggingSlot = true;
        this.mapState.draggedSlotId = slotId;
        this.mapState.slotDragStartX = e.clientX;
        this.mapState.slotDragStartY = e.clientY;
        this.mapState.slotOriginalX = slot.x;
        this.mapState.slotOriginalY = slot.y;

        // Visual feedback
        const slotEl = document.querySelector(`[data-slot-id="${slotId}"]`);
        if (slotEl) {
            slotEl.style.cursor = 'grabbing';
            slotEl.style.opacity = '0.7';
        }
    }

    handleSlotDragMove(e) {
        const slot = this.slots.find(s => s.id === this.mapState.draggedSlotId);
        if (!slot) return;

        // Calculate movement in world coordinates (accounting for map transform)
        const dx = (e.clientX - this.mapState.slotDragStartX) / this.mapState.scale;
        const dy = (e.clientY - this.mapState.slotDragStartY) / this.mapState.scale;

        const newX = this.mapState.slotOriginalX + dx;
        const newY = this.mapState.slotOriginalY + dy;

        // Update slot position temporarily
        slot.x = newX;
        slot.y = newY;

        // Update DOM
        const slotEl = document.querySelector(`[data-slot-id="${slot.id}"]`);
        if (slotEl) {
            slotEl.style.left = `${newX}px`;
            slotEl.style.top = `${newY}px`;
        }

        // Redraw gridlines dynamically (throttled with requestAnimationFrame)
        if (!this.mapState.redrawScheduled) {
            this.mapState.redrawScheduled = true;
            requestAnimationFrame(() => {
                this.drawAllConnections();
                this.mapState.redrawScheduled = false;
            });
        }
    }

    handleSlotDragEnd(e) {
        const slot = this.slots.find(s => s.id === this.mapState.draggedSlotId);
        if (!slot) {
            this.mapState.isDraggingSlot = false;
            return;
        }

        // Free old grid cells
        this.freeGridCells(this.mapState.slotOriginalX, this.mapState.slotOriginalY);

        // Validate new position
        if (!this.canPlaceSlot(slot.x, slot.y, slot.id)) {
            // Find nearest valid position ("bump" away from obstacles)
            const validPos = this.findNearestValidPosition(slot.x, slot.y, slot.id);
            slot.x = validPos.x;
            slot.y = validPos.y;

            // Update DOM to final position
            const slotEl = document.querySelector(`[data-slot-id="${slot.id}"]`);
            if (slotEl) {
                slotEl.style.left = `${slot.x}px`;
                slotEl.style.top = `${slot.y}px`;
            }
        }

        // Occupy new grid cells
        this.occupyGridCells(slot.x, slot.y, slot.id);

        // CRITICAL FIX: Update occupiedLanes to match new position
        const oldX = this.mapState.slotOriginalX;
        const oldY = this.mapState.slotOriginalY;
        const newX = slot.x;
        const newY = slot.y;

        if (oldX !== newX || oldY !== newY) {
            // Remove from old position in occupiedLanes
            if (this.occupiedLanes.has(oldX)) {
                this.occupiedLanes.get(oldX).delete(oldY);
                if (this.occupiedLanes.get(oldX).size === 0) {
                    this.occupiedLanes.delete(oldX);
                }
            }

            // Add to new position in occupiedLanes
            if (!this.occupiedLanes.has(newX)) {
                this.occupiedLanes.set(newX, new Set());
            }
            this.occupiedLanes.get(newX).add(newY);
        }

        // Reset visual feedback
        const slotEl = document.querySelector(`[data-slot-id="${slot.id}"]`);
        if (slotEl) {
            slotEl.style.cursor = 'pointer';
            slotEl.style.opacity = '1';
        }

        // Redraw connections at final position
        this.drawAllConnections();

        // Clear drag state
        this.mapState.isDraggingSlot = false;
        this.mapState.draggedSlotId = null;
    }

    findNearestValidPosition(x, y, slotId) {
        // Try positions in expanding spiral around target position
        const step = 20; // Test positions every 20px
        const maxRadius = 200;

        for (let radius = step; radius <= maxRadius; radius += step) {
            // Try cardinal directions first
            const testPositions = [
                { x: x, y: y - radius },      // Up
                { x: x + radius, y: y },      // Right
                { x: x, y: y + radius },      // Down
                { x: x - radius, y: y },      // Left
                { x: x + radius, y: y - radius }, // Up-right
                { x: x + radius, y: y + radius }, // Down-right
                { x: x - radius, y: y + radius }, // Down-left
                { x: x - radius, y: y - radius }  // Up-left
            ];

            for (const pos of testPositions) {
                if (this.canPlaceSlot(pos.x, pos.y, slotId)) {
                    return pos;
                }
            }
        }

        // If no valid position found, return original
        return { x, y };
    }

    handleMapWheel(e) {
        e.preventDefault();

        // Get mouse position relative to viewport
        const rect = this.mapViewport.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Calculate zoom
        const zoomIntensity = 0.1;
        const delta = e.deltaY > 0 ? -zoomIntensity : zoomIntensity;
        const newScale = Math.max(0.5, Math.min(2, this.mapState.scale + delta));

        // Zoom towards mouse position
        const scaleFactor = newScale / this.mapState.scale;

        this.mapState.panX = mouseX - (mouseX - this.mapState.panX) * scaleFactor;
        this.mapState.panY = mouseY - (mouseY - this.mapState.panY) * scaleFactor;
        this.mapState.scale = newScale;

        this.updateMapTransform();
    }

    updateMapTransform() {
        this.mapCanvas.style.transform =
            `translate(${this.mapState.panX}px, ${this.mapState.panY}px) scale(${this.mapState.scale})`;
    }

    reset() {
        this.encountersContainer.innerHTML = '';

        // Clear all slots and their DOM elements
        this.mapSlots.innerHTML = '';
        this.slots = [];

        // Reinitialize slots from scratch
        this.initializeMapSlots();

        // Reset tutorial flag
        this.mapState.tutorialShown = false;

        this.updateGameStats();
    }
}

export { UI };
