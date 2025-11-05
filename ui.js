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

        // Templates
        this.encounterTemplate = document.getElementById('encounter-template');
        this.cardTemplate = document.getElementById('card-template');

        // Update initial state
        this.updateGameStats();
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

    renderEncounter(encounter) {
        let encounterEl = document.querySelector(`[data-encounter-id="${encounter.id}"]`);

        if (!encounterEl) {
            // Create new encounter element
            encounterEl = this.encounterTemplate.content.cloneNode(true).querySelector('.encounter');
            encounterEl.setAttribute('data-encounter-id', encounter.id);
            encounterEl.classList.add(`difficulty-${encounter.type.difficulty}`);
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
        cardsContainer.innerHTML = '';

        // Render hand cards
        encounter.hand.forEach(card => {
            const cardEl = this.createCardElement(card, false);
            cardEl.addEventListener('click', () => {
                if (!encounter.completed && !encounter.failed) {
                    this.game.playCardInEncounter(encounter.id, card.id);
                }
            });
            cardsContainer.appendChild(cardEl);
        });

        // Render played cards (slightly faded)
        encounter.playedCards.forEach(card => {
            const cardEl = this.createCardElement(card, true);
            cardsContainer.appendChild(cardEl);
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

    removeEncounter(encounterId) {
        const encounterEl = document.querySelector(`[data-encounter-id="${encounterId}"]`);
        if (encounterEl) {
            encounterEl.remove();
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

    reset() {
        this.encountersContainer.innerHTML = '';
        this.updateGameStats();
    }
}

export { UI };
