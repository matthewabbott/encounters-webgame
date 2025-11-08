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
        this.encounterTethers = document.getElementById('encounter-tethers');
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

        // Spatial grid system for drag collision detection only
        this.slotSize = 120; // Slot visual size
        this.slotPadding = 40; // Minimum padding between slots
        this.gridCellSize = 60; // Grid cell size (half of slot size)
        this.spatialGrid = new Map(); // Maps "x,y" grid cell to slot ID

        // Create the starting slot
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

        // Mark spatial grid cells as occupied (for drag collision detection)
        this.occupyGridCells(x, y, id);

        // Create DOM elements: port > socket > slot
        // Port is the outer container that can be dragged
        const portEl = document.createElement('div');
        portEl.className = 'map-port';
        portEl.style.left = `${slot.x}px`;
        portEl.style.top = `${slot.y}px`;
        portEl.setAttribute('data-slot-id', slot.id);

        // Socket is the inner container that accepts encounters
        const socketEl = document.createElement('div');
        socketEl.className = 'map-socket';

        // Socket handles encounter placement
        socketEl.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleSlotClick(slot.id);
        });

        // Socket allows dragging when no card selected (makes drag area larger)
        socketEl.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevent text selection
            e.stopPropagation();

            // Allow dragging from socket too (not just port frame)
            // This makes the draggable area much larger and easier to grab
            this.handleSlotDragStart(e, slot.id);
        });

        // Port handles dragging (when no encounter card selected)
        portEl.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevent text selection and default drag behavior
            e.stopPropagation();
            this.handleSlotDragStart(e, slot.id);
        });

        // Slot element shows the status and contains minimized encounter
        const slotEl = document.createElement('div');
        slotEl.className = `map-slot ${slot.status}`;

        // Assemble the structure
        socketEl.appendChild(slotEl);
        portEl.appendChild(socketEl);
        this.mapSlots.appendChild(portEl);

        // Generate unlock data for this slot (but don't create slots yet)
        this.generateUnlockDataForSlot(slot);

        // Update next slot ID
        if (id >= this.nextSlotId) {
            this.nextSlotId = id + 1;
        }

        return slot;
    }

    generateUnlockDataForSlot(slot) {
        // Simple tree layout: each slot defines 1-3 new slots
        const numUnlocks = Math.floor(Math.random() * 3) + 1; // 1-3 unlocks

        // Calculate position for children (fixed distance from parent)
        const childX = slot.x + this.slotSpacing;

        // Spread children vertically based on count
        let childYOffsets = [];
        if (numUnlocks === 1) {
            // Single child: same Y as parent (straight ahead)
            childYOffsets = [0];
        } else if (numUnlocks === 2) {
            // Two children: spread above and below parent
            childYOffsets = [-100, 100];
        } else {
            // Three children: spread across three positions
            childYOffsets = [-140, 0, 140];
        }

        // Create unlock data for each child
        for (let i = 0; i < numUnlocks; i++) {
            const nextId = this.nextSlotId++;
            const childY = slot.y + childYOffsets[i];

            slot.unlockData.push({
                id: nextId,
                x: childX,
                y: childY
            });
        }
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

    drawTether(portX, portY, windowX, windowY) {
        // Draw a simple line from port to floating window
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', portX);
        line.setAttribute('y1', portY);
        line.setAttribute('x2', windowX);
        line.setAttribute('y2', windowY + 200); // Connect to top of window (offset by 200px)
        line.setAttribute('class', 'tether-line');

        this.encounterTethers.appendChild(line);
    }

    drawAllTethers() {
        // Clear existing tethers
        this.encounterTethers.innerHTML = '';

        // Draw tethers for all active (non-minimized) encounters
        for (const encounter of this.game.encounters.values()) {
            if (!encounter.minimized && encounter.slotId !== null) {
                const slot = this.slots.find(s => s.id === encounter.slotId);
                if (slot) {
                    this.drawTether(slot.x, slot.y, slot.x, slot.y - 200);
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
            // Validate that the index is still valid (hand might have changed)
            if (this.mapState.selectedHandIndex >= 0 && this.mapState.selectedHandIndex < this.game.encounterHand.length) {
                const result = this.game.playEncounterFromHand(this.mapState.selectedHandIndex, slotId);
                if (result) {
                    this.clearSlotSelection();
                    this.mapState.tutorialShown = true;
                }
            } else {
                // Index is out of range, clear it and prompt user to select again
                this.clearSlotSelection();
                this.game.ui.showNotification('Selection Lost', 'Please select an encounter card from your hand again.', '⚠️');
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
        // Find the slot that was completed
        const completedSlot = this.slots.find(s => s.id === slotId);
        if (!completedSlot || !completedSlot.unlockData) return;

        // Create and unlock new slots based on unlock data
        // With tree layout, no collision detection needed - positions are guaranteed valid
        completedSlot.unlockData.forEach(unlockInfo => {
            // Check if slot already exists
            let slot = this.slots.find(s => s.id === unlockInfo.id);

            if (!slot) {
                // Create new slot with unlocked status
                slot = this.createSlot(unlockInfo.id, unlockInfo.x, unlockInfo.y, 'unlocked');
            } else if (slot.status === 'locked') {
                // Unlock existing slot
                slot.status = 'unlocked';
                const portEl = document.querySelector(`[data-slot-id="${unlockInfo.id}"]`);
                if (portEl) {
                    const slotEl = portEl.querySelector('.map-slot');
                    if (slotEl) {
                        slotEl.classList.remove('locked');
                        slotEl.classList.add('unlocked');
                    }
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
        // Assign encounter to slot if not already assigned
        if (encounter.slotId === null) {
            const slot = this.assignEncounterToSlot(encounter);
            if (!slot) {
                console.error('No available slot for encounter!');
                return;
            }
        }

        const slot = this.slots.find(s => s.id === encounter.slotId);
        if (!slot) {
            console.error('Could not find slot for encounter!');
            return;
        }

        // Render minimized version in socket (always visible)
        this.renderMinimizedEncounter(encounter, slot);

        // Render or hide floating window based on minimized state
        if (!encounter.minimized) {
            this.renderFloatingEncounter(encounter, slot);
        } else {
            // Hide floating window if it exists
            const floatingEl = document.querySelector(`[data-encounter-id="${encounter.id}"].encounter-floating`);
            if (floatingEl) {
                floatingEl.style.display = 'none';
            }
        }

        // Redraw all tethers (for all active encounters)
        this.drawAllTethers();
    }

    renderMinimizedEncounter(encounter, slot) {
        const portEl = document.querySelector(`[data-slot-id="${slot.id}"]`);
        if (!portEl) return;

        const socketEl = portEl.querySelector('.map-socket');
        if (!socketEl) return;

        // Check if minimized version already exists
        let miniEl = socketEl.querySelector('.encounter-mini');
        if (!miniEl) {
            miniEl = document.createElement('div');
            miniEl.className = 'encounter-mini';
            socketEl.appendChild(miniEl);
        }

        // Update minimized encounter content
        miniEl.setAttribute('data-encounter-id', encounter.id);

        // Get category info
        const categoryData = CategoryInfo[encounter.type.category];

        // Set content and status class
        miniEl.className = 'encounter-mini';
        if (encounter.completed && !encounter.rewardsCollected) {
            miniEl.classList.add('rewards-available');
        } else if (encounter.completed) {
            miniEl.classList.add('completed');
        } else if (encounter.failed) {
            miniEl.classList.add('failed');
        } else {
            miniEl.classList.add('active');
        }

        // Show category icon and status indicator
        miniEl.innerHTML = `
            <div class="mini-icon">${categoryData?.icon || '?'}</div>
            <div class="mini-status">${encounter.completed ? '✓' : encounter.failed ? '✗' : '▶'}</div>
        `;

        // Click to maximize
        miniEl.onclick = (e) => {
            e.stopPropagation();
            if (encounter.minimized) {
                this.game.toggleEncounterMinimize(encounter.id);
            }
        };
    }

    renderFloatingEncounter(encounter, slot) {
        let encounterEl = document.querySelector(`[data-encounter-id="${encounter.id}"].encounter-floating`);

        if (!encounterEl) {
            // Create new floating encounter element
            encounterEl = this.encounterTemplate.content.cloneNode(true).querySelector('.encounter');
            encounterEl.setAttribute('data-encounter-id', encounter.id);
            encounterEl.classList.add(`difficulty-${encounter.type.difficulty}`);
            encounterEl.classList.add('encounter-on-map');
            encounterEl.classList.add('encounter-floating');

            // Position at slot coordinates (will be offset above the slot)
            encounterEl.style.left = `${slot.x}px`;
            encounterEl.style.top = `${slot.y - 200}px`; // Offset above the port

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
        } else {
            // Show it if it was hidden
            encounterEl.style.display = 'block';
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
        // Don't start drag if user has an encounter card selected (they want to place it)
        if (this.mapState.selectedHandIndex !== null) {
            return;
        }

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

        // Snap to 40px grid
        const gridSize = 40;
        slot.x = Math.round(slot.x / gridSize) * gridSize;
        slot.y = Math.round(slot.y / gridSize) * gridSize;

        // Update DOM with snapped position
        const portEl = document.querySelector(`[data-slot-id="${slot.id}"]`);
        if (portEl) {
            portEl.style.left = `${slot.x}px`;
            portEl.style.top = `${slot.y}px`;
        }

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

        // Update all parent slots' unlockData to track this slot's new position
        for (const parentSlot of this.slots) {
            if (parentSlot.unlockData) {
                for (const unlockInfo of parentSlot.unlockData) {
                    if (unlockInfo.id === slot.id) {
                        // Update the unlock data to point to new position
                        unlockInfo.x = slot.x;
                        unlockInfo.y = slot.y;
                    }
                }
            }
        }

        // Reset visual feedback
        const portElFinal = document.querySelector(`[data-slot-id="${slot.id}"]`);
        if (portElFinal) {
            portElFinal.style.cursor = 'pointer';
            portElFinal.style.opacity = '1';
        }

        // Redraw connections at final position (now using updated unlockData)
        this.drawAllConnections();
        this.drawAllTethers();

        // Clear drag state
        this.mapState.isDraggingSlot = false;
        this.mapState.draggedSlotId = null;
    }

    findNearestValidPosition(x, y, slotId) {
        // Try positions in expanding spiral around target position
        // All positions snapped to 40px grid
        const gridSize = 40;
        const step = 40; // Test positions every grid cell (40px)
        const maxRadius = 320; // Expand search radius

        for (let radius = step; radius <= maxRadius; radius += step) {
            // Try cardinal directions first (up, right, down, left)
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
                // Snap to grid
                const snappedX = Math.round(pos.x / gridSize) * gridSize;
                const snappedY = Math.round(pos.y / gridSize) * gridSize;

                if (this.canPlaceSlot(snappedX, snappedY, slotId)) {
                    return { x: snappedX, y: snappedY };
                }
            }
        }

        // If no valid position found nearby, return grid-snapped original
        return {
            x: Math.round(x / gridSize) * gridSize,
            y: Math.round(y / gridSize) * gridSize
        };
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
        // Clear all encounter elements
        this.encountersContainer.innerHTML = '';
        this.encounterTethers.innerHTML = '';

        // Re-lock all slots except the starting slot (id 0)
        for (const slot of this.slots) {
            slot.encounterId = null; // Clear encounter assignments

            if (slot.id === 0) {
                // Keep starting slot unlocked
                slot.status = 'unlocked';
            } else {
                // Lock all other slots
                slot.status = 'locked';

                // Update DOM to show locked state
                const portEl = document.querySelector(`[data-slot-id="${slot.id}"]`);
                if (portEl) {
                    const slotEl = portEl.querySelector('.map-slot');
                    if (slotEl) {
                        slotEl.classList.remove('unlocked');
                        slotEl.classList.add('locked');
                    }
                }
            }

            // Clear any minimized encounters from sockets
            const portEl = document.querySelector(`[data-slot-id="${slot.id}"]`);
            if (portEl) {
                const miniEl = portEl.querySelector('.encounter-mini');
                if (miniEl) {
                    miniEl.remove();
                }
            }
        }

        // Redraw connections (will show all as locked except from slot 0)
        this.drawAllConnections();

        // Reset tutorial flag
        this.mapState.tutorialShown = false;

        this.updateGameStats();
    }
}

export { UI };
