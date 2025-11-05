# Parallel Encounters - Card Game Prototype

A roguelike card game prototype where you manage multiple encounters simultaneously, all drawing from a single shared deck.

## Core Concept

Unlike traditional roguelike card games where you face one encounter at a time, in **Parallel Encounters** you can enter multiple encounters simultaneously. The twist: **all encounters share the same deck of cards**.

This creates strategic depth through:
- **Resource allocation**: Cards in one encounter's hand cannot be drawn in another
- **Deck knowledge**: You know what's left in the deck and can time encounters accordingly
- **Completion strategy**: Completing encounters shuffles cards back, refreshing your options

## How to Play

1. **Open `index.html` in your browser** (no build step required!)
2. Click "Start New Encounter" to begin
3. Each encounter has different win conditions (see Encounter Types below)
4. Click cards to play them in that encounter
5. Click "Draw Card" to draw additional cards from the shared deck
6. Complete or abandon encounters to return cards to the deck

## Encounter Types

The prototype includes 6 different encounter types:

- **Sum Target**: Play cards that sum to exactly 21 (bust if you go over)
- **High Card**: Draw and play cards, win if you hit a King
- **Color Match**: Play 5 cards of the same color
- **Avoid Tricks**: Play all cards without hitting face cards
- **Suit Run**: Play 4 cards of the same suit
- **Pair Up**: Play exactly 2 cards with matching rank

## Files

- `index.html` - Main game interface
- `styles.css` - Game styling
- `game.js` - Core game logic, deck management, game state
- `encounters.js` - Encounter type definitions
- `ui.js` - UI rendering and interactions

## Future Ideas

- Deck stacking/manipulation mechanics
- Card modifications and upgrades
- Items and powerups
- More encounter types (trick-taking, poker hands, etc.)
- Roguelike meta-progression
- Difficulty scaling
- Sound effects and animations

## Tech Stack

Pure vanilla JavaScript (ES6 modules), HTML, and CSS. No dependencies, no build tools.

## Development

This is an early prototype built to test the parallel encounters concept. The code is modular and can be ported to other platforms (Three.js, Godot, etc.) as the game develops.
