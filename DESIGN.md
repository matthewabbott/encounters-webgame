# Parallel Encounters - Game Design Document

## Theme: Cyberpunk Netrunner

You're a netrunner infiltrating a corporate blacksite. Each "encounter" is a piece of ICE (Intrusion Countermeasures Electronics) or daemon you must hack/manipulate. You're playing these hostile programs against each other by carefully managing your limited deck of command cards.

---

## Core Gameplay Loop (Single Run)

### Starting State
- **Small starting deck**: 15-20 cards (subset of full 52-card deck)
- **Limited encounter slots**: Start with 2-3 max active encounters
- **Limited inventory**: 0-2 consumable slots initially
- **Goal**: Defeat X encounters to complete the run (breach the blacksite)

### Turn Flow
1. **Select Encounter**: Choose 1 of 3 randomly offered encounters
2. **Attempt Resolution**: Play cards to meet encounter conditions
3. **Resolve Outcome**:
   - **Success**: Choose 1 of 3 rewards
   - **Failure/Abandon**: Suffer penalty (lose cards? Take damage?)
4. **Repeat** until run complete or player defeated

### Rewards (Pick 1 of 3)
- **Add cards to deck**: Gain 3-5 new cards thematically related to encounter
- **Upgrade slot**: Add encounter slot OR inventory slot
- **Consumable item**: Permanent deck modification or encounter manipulation
- **Card modification**: Upgrade existing cards (wild suit, +value, etc.)

---

## Encounter System

### Encounter Selection
- Present **3 random encounters** each time
- Show: Name, Type, Difficulty, Reward Tier
- **Commitment**: Once started, cannot abandon without penalty
- **Penalty for failure**: Lose cards from deck, or forced to add "virus" cards

### Difficulty Tiers
- **Easy** (Green): Simple conditions, basic rewards
- **Medium** (Yellow): Moderate complexity, good rewards
- **Hard** (Red): Complex conditions, excellent rewards
- **Elite** (Purple): Special encounters with unique mechanics, rare rewards

### Encounter Types by Difficulty

#### EASY
- **Sum Target (Small)**: Reach exactly 15 (instead of 21)
- **High Card**: Play any face card (not just King)
- **Color Pair**: Play 2 cards of same color

#### MEDIUM
- **Sum Target**: Reach exactly 21
- **Color Match**: 5 cards same color
- **Suit Run**: 4 cards same suit
- **Avoid Tricks**: Play all cards without face cards

#### HARD
- **Straight**: Play 5 cards in rank sequence
- **Full House**: 3 of one rank, 2 of another
- **War**: Automated - highest cumulative value across 5 draws wins
- **Trick Taking**: Win exactly X tricks against AI opponent

#### ELITE
- **Boss Programs**: Multi-stage encounters
- **Combo Encounters**: Satisfy multiple conditions

---

## Card Draw Mechanics

### Variable Draw System
Some encounters use **controlled draw** instead of initial hand:
- Encounter gives you option to "Draw up to 5 cards"
- You must draw and play all 5 eventually
- Gives control over timing and card availability
- Useful when you want to preserve specific cards for other encounters

---

## Consumable System (Balatro-inspired)

### Types of Consumables

#### **Deck Modifiers** (Permanent)
- **Wild Suit Marker**: Mark a card to be any suit
- **Value Booster**: +1 to a card's value permanently
- **Card Duplicator**: Add copy of a card to deck
- **Card Destructor**: Remove a card from deck permanently

#### **Encounter Manipulators** (One-time use, adds card to deck)
- **Foe Capture**: Take a card from compatible encounter, add to hand AND deck
- **Foe Bribe**: Give a card from deck to encounter (sacrifice to auto-complete)
- **Encounter Refresh**: Reroll the 3 offered encounters
- **Deck Stack**: Look at top 5 cards, rearrange them

---

## Deck Stacking & Knowledge

### Deck View Modes

#### **Spread View** (Like Balatro)
- All cards in deck laid out horizontally
- Can see composition at a glance
- Hover for details

#### **Ordered View** (Stack Tracking)
- Shows deck as sequence (top → bottom)
- **Face-up**: Cards you know position of (via stacking abilities)
- **Face-down**: Unknown positions
- Example: If you stacked 3 cards on top and 1 on bottom, leftmost 3 and rightmost 1 are revealed

### Stacking Mechanics
- Certain rewards/consumables let you stack cards
- "Draw X, then place them on top of deck in any order"
- Gives strategic control over future draws

---

## Meta Progression

### Unlockables
- **Starting Decks**: Different card compositions/themes
  - "High Roller" (face cards & 10s)
  - "Suited Up" (balanced suits, good for runs)
  - "Lucky Low" (aces through 7s, many cards)
- **New Encounter Types**: Unlock harder/more interesting encounters
- **New Consumables**: More powerful manipulation tools
- **Run Modifiers**: "Challenges" that change rules for expert players

### Different Run Types
- **Basic Run**: "Breach the Database" - 10 encounters
- **Advanced Run**: "Steal the Prototype" - 15 encounters, harder ICE
- **Boss Rush**: "Delete the AI" - 5 elite encounters
- **Endless**: See how far you can go

---

## UI/UX Improvements

### Visual Distinction for Encounters

Each encounter type should have:
- **Unique color scheme** (e.g., Sum Target = orange, Color Match = rainbow gradient)
- **Distinct shape** (border style, corner rounding)
- **Icon/Emblem** (symbolic representation)
- **Cyberpunk flavor names**:
  - Sum Target → "Arithmetic ICE"
  - Color Match → "Chromatic Firewall"
  - Suit Run → "Sequential Lock"
  - High Card → "Authority Check"
  - Avoid Tricks → "Stealth Protocol"

### Deck Visualization
- **Tab/button** to toggle between encounter view and deck view
- **Spread view**: See all cards at once
- **Stack view**: See ordered deck with known positions
- **Stats**: Card type breakdown, average value, etc.

---

## Implementation Priority

### Phase 1: Core Loop (MVP)
- [ ] Small starting deck (20 cards)
- [ ] Choose 1 of 3 encounters system
- [ ] Basic difficulty tiers (Easy/Medium/Hard colors)
- [ ] Simple reward system (add cards to deck)
- [ ] No-abandon rule (or penalty)
- [ ] Win/loss condition for a run

### Phase 2: Progression
- [ ] Pick 1 of 3 rewards
- [ ] Reward types: cards, slots, consumables
- [ ] Basic consumables (2-3 types)
- [ ] Inventory system
- [ ] Run completion screen with stats

### Phase 3: Depth
- [ ] More encounter types (War, Trick-taking, etc.)
- [ ] Controlled draw system
- [ ] Deck stacking mechanics
- [ ] Card modification system
- [ ] Difficulty scaling through run

### Phase 4: Polish & Meta
- [ ] Visual distinction for encounter types
- [ ] Deck spread view
- [ ] Deck ordered view (stacking visualization)
- [ ] Multiple starting decks
- [ ] Different run types
- [ ] Unlockable content
- [ ] Cyberpunk theme/flavor text

---

## Open Questions to Resolve

1. **Failure state**: What happens when you can't complete an encounter?
   - Permanent card loss?
   - "Virus" cards added to deck (dead weight)?
   - Run ends immediately?

2. **Resource constraints**: Do we need a "health" or "ICE alert level" system?
   - Maybe harder encounters raise alert level
   - Alert level affects future encounter difficulty
   - Too high = run fails

3. **Encounter progression**: Linear or branching?
   - Linear: Complete 10 encounters in sequence
   - Branching: Choose path through node map (Slay the Spire style)

4. **Card removal**: Should there be ways to remove cards beyond consumables?
   - Rest sites where you can trim deck?
   - Risky encounters that remove cards on failure but give great rewards?

5. **Variable starting decks**: How much variety?
   - Always same 20 cards to start?
   - Random subset of 52 each run?
   - Fixed but unlockable starting configurations?

---

## Thematic Naming (Cyberpunk)

### General Terms
- Deck → "Command Stack"
- Cards → "Command Codes" or "Data Packets"
- Encounter → "ICE Node" or "Security Protocol"
- Consumable → "Exploit" or "Zero-Day"
- Run → "Intrusion" or "Breach"

### Encounter Type Names
- Sum Target → **Arithmetic ICE** or **Checksum Lock**
- High Card → **Authority Protocol**
- Color Match → **Chromatic Firewall**
- Suit Run → **Sequential Lock**
- Avoid Tricks → **Stealth Corridor**
- Pair Up → **Mirror Authentication**
- War → **Brute Force Clash**
- Straight → **Linear Sequence**

