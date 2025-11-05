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

        // Templates
        this.encounterTemplate = document.getElementById('encounter-template');
        this.cardTemplate = document.getElementById('card-template');

        // Generate initial upcoming encounters
        this.upcomingEncounterOptions = [];

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

    reset() {
        this.encountersContainer.innerHTML = '';
        this.updateGameStats();
    }
}

export { UI };
