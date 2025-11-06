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
            selectedSlotId: null // For encounter placement
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
        // Create a simple grid of slots for testing
        // Later this will be procedurally generated
        this.slots = [
            { id: 0, x: 200, y: 200, status: 'unlocked', encounterId: null },  // Starting slot
            { id: 1, x: 400, y: 200, status: 'unlocked', encounterId: null },
            { id: 2, x: 600, y: 200, status: 'locked', encounterId: null },
            { id: 3, x: 400, y: 400, status: 'locked', encounterId: null },
            { id: 4, x: 600, y: 400, status: 'locked', encounterId: null },
            { id: 5, x: 800, y: 300, status: 'locked', encounterId: null }
        ];

        this.slots.forEach((slot) => {
            const slotEl = document.createElement('div');
            slotEl.className = `map-slot ${slot.status}`;
            slotEl.style.left = `${slot.x}px`;
            slotEl.style.top = `${slot.y}px`;
            slotEl.setAttribute('data-slot-id', slot.id);

            // Add click handler for unlocked empty slots
            slotEl.addEventListener('click', (e) => {
                e.stopPropagation(); // Don't trigger map pan
                this.handleSlotClick(slot.id);
            });

            this.mapSlots.appendChild(slotEl);
        });
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
            }
        } else {
            // No card selected - prompt to select from hand
            this.game.ui.showNotification('Select an Encounter', 'Click a card from your hand at the bottom of the screen to place it here.', '💡');
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
            }
        } else {
            // No slot selected - prompt user to select a slot
            this.game.ui.showNotification('Select a Slot', 'Click an unlocked slot on the map to place this encounter.', '💡');

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
        encounterEl.classList.remove('completed', 'failed', 'locked');
        const statusEl = encounterEl.querySelector('.encounter-status');

        if (encounter.completed) {
            encounterEl.classList.add('completed');
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
            completeBtn.textContent = 'Collect Rewards';
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
        // Don't start drag if clicking on an encounter or button
        if (e.target.closest('.encounter') || e.target.closest('button')) {
            return;
        }

        this.mapState.isDragging = true;
        this.mapState.dragStartX = e.clientX;
        this.mapState.dragStartY = e.clientY;
        this.mapState.panStartX = this.mapState.panX;
        this.mapState.panStartY = this.mapState.panY;
    }

    handleMapMouseMove(e) {
        if (!this.mapState.isDragging) return;

        const dx = e.clientX - this.mapState.dragStartX;
        const dy = e.clientY - this.mapState.dragStartY;

        this.mapState.panX = this.mapState.panStartX + dx;
        this.mapState.panY = this.mapState.panStartY + dy;

        this.updateMapTransform();
    }

    handleMapMouseUp(e) {
        this.mapState.isDragging = false;
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

        // Free all slots
        this.slots.forEach(slot => {
            slot.encounterId = null;
        });

        this.updateGameStats();
    }
}

export { UI };
