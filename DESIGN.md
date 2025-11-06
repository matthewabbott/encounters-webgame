# Parallel Encounters - Game Design Document

## Theme: Cyberpunk Netrunner

You're a netrunner infiltrating a corporate blacksite. Each "encounter" is a piece of ICE (Intrusion Countermeasures Electronics) or daemon you must hack/manipulate. You're playing these hostile programs against each other by carefully managing your limited deck of command cards.

---

## CURRENT IMPLEMENTATION STATUS

### Completed
- ✅ Circuit board map with pan/zoom
- ✅ Slot visualization (unlocked/locked)
- ✅ Encounter deck system (shuffled deck of encounters)
- ✅ Encounter hand (3 cards displayed at bottom)
- ✅ Click card → click slot → place encounter
- ✅ Encounter categories with visual badges

### In Progress / Near Future

**"The Outside Hand" - Unified Bottom UI (HIGH PRIORITY)**

The bottom panel should be "the outside hand" - everything the player holds that isn't on the map.

**Minimizable Design**:
- Default: Receded toward bottom, showing only top corners of items
- Each item shows its icon/symbol in the corner
- **Hover**: Slightly expands to show more info
- **Click**: Fully expands to show all details
- Saves screen space while keeping items accessible

**Contents**:
- **Encounter cards** (current implementation)
- **Consumables** (future: one-time use items)
- **Literal playing cards** (future: rare drops that can be played into any encounter)
- Other meta-items

**Implementation**:
- Single visual container
- Multiple data structures under the hood (encounterHand, consumables[], etc.)
- Consistent visual language across all item types

---

## NEXT EVOLUTION: Circuit Board Map + Encounter Deck System

**Status**: Partially implemented (map + deck done, slot progression pending)

This represents the next major evolution of the game, transforming it from a simple slot-based system into a spatial strategy game with encounter hand management.

### Core Vision: Netrunner Stringing Together Gadgets

The player is a netrunner navigating a **circuit board-style map**, placing and resolving encounters (exploits/gadgets) to breach the system. The aesthetic is geometric, cyberspace, computer-chip inspired.

### Map System

**Visual**: Circuit board with geometric, cyberspace aesthetic (think Tron meets PCB layouts)

**Structure**:
- **Orientation**: Left-to-right progression
- **Starting State**: Single unlocked slot
- **Zoomable/Scrollable**: Similar to Slay the Spire map, but more interactive

**Slot Unlocking**:
- Completing an encounter unlocks slots "past" it
- Procedurally generated unlock patterns
- Pattern influenced by:
  - Encounter type resolved
  - Potentially: consumables/items (future)
  - Possibly: encounter category synergies

**Slot States**:
1. **Locked**: Not yet accessible (grayed out)
2. **Unlocked/Empty**: Available for encounter placement
3. **Active**: Contains in-progress encounter
4. **Resolved**: Encounter completed successfully
   - **KEY CHANGE**: Resolved encounters DON'T auto-clear
   - Cards remain tied up in slot
   - Must manually collect rewards to free cards

**Strategic Implications**:
- **Card Lock Strategy**: Leave resolved encounters on board to prevent their cards from appearing in future encounters
- **Reward Timing**: Collecting rewards returns cards to deck - choose when to do this
- **Progression Blockers**:
  - No open slots (all filled with active/resolved encounters)
  - No encounters in hand to play
  - Deadlock (all active encounters failed)

### Encounter Deck System

**Core Mechanic**: Encounters are drawn from a deck, not randomly generated

**Encounter Hand**:
- Default hand size: **3 encounters**
- Can be modified by upgrades/items
- Draw new encounter when one is played
- Empty encounter deck = can't draw more (blocked until more added)

**Encounter Card Display**:
Shows limited information to allow strategic planning without perfect knowledge:

1. **Difficulty/Rarity Color**:
   - Green: Easy
   - Yellow: Medium
   - Red: Hard
   - Purple: Boss
   - Other colors: Special/friendly encounters

2. **Category Symbol**:
   - Visual icon representing encounter family
   - Examples: puzzle icon, duel swords, chain link, etc.
   - Does NOT show exact rules or randomized values
   - Experienced players can plan based on category
   - Categories might be:
     - Sum Puzzles
     - Sequence Challenges
     - Collection Challenges
     - Duels
     - Multi-Stage
     - Shops/Events

3. **Type Label** (hostile vs friendly):
   - Different visual treatment for shops, events, etc.
   - Color-coded card backgrounds

**Encounter Deck Evolution**:
- **Dynamic Deck**: Certain encounters shuffle new encounters into deck
- **Early Choices Matter**: Choosing specific encounters adds more of certain types
- **Deck Building**: Strategic choices about which encounters to take
- **Speed Run vs Completionist**:
  - Speed: Only pick encounters that don't add to deck → rush boss
  - Completionist: Pick encounters that add more → more rewards, longer run

**Boss Accessibility**:
- Boss encounter always available at bottom of encounter deck
- Can rush to boss by depleting deck quickly
- Or take time to build up with more encounters

**Deck Depletion**:
- Running out of encounter deck = progression blocker
- Can't draw new encounters if deck empty
- Can still:
  - Complete active encounters
  - Collect rewards from resolved encounters
  - Fight boss encounter (if available)
- Similar to "no open slots" blocker - not game over, but limits options

### Slot Compatibility System (Future)

**Concept**: Some slots have restrictions on encounter types

**Examples**:
- **Hostile-only slots**: Can't place shops/friendly encounters
- **Category-specific slots**: Only accepts certain encounter families
- **Difficulty gates**: Only accepts certain difficulty tiers

**Strategic Depth**:
- Spatial puzzle element in encounter placement
- Planning hand management around slot availability
- Unlock patterns create interesting constraints

**Consumable Interaction**:
- Items might bypass compatibility restrictions
- Or modify slot types
- Or unlock specific slot patterns

### Reward Collection Changes

**Current MVP**: Automatic on encounter completion

**New System**:
- Resolved encounters remain on board
- Cards stay locked in the encounter
- **Manual collection**: Player chooses when to collect
- Collecting returns cards to deck AND frees the slot

**Strategic Decision**:
- Collect early: Get rewards + cards back in deck
- Collect late: Keep cards locked away from future encounters
- Slot pressure: Need to collect to free slots for new encounters

**Example Scenario**:
1. Complete encounter with 3 Aces
2. Leave it on board (Aces can't be drawn by new encounters)
3. Progress through several encounters without Aces interfering
4. Eventually collect rewards when you want Aces back or need the slot

---

## REFINED MVP DESIGN (Current Target)

### Starting State
- **Starting deck**: 12 cards (A-3 of each suit: ♠♥♣♦)
- **Encounter slots**: 2 slots
- **Inventory slots**: 0 (must be earned)
- **Goal**: Clear 6-8 encounters, then defeat boss encounter

### Encounter Progression
1. Choose 1 of 3 randomly offered encounters
2. After clearing 6 encounters, boss encounters become available
3. **Boss Selection**: Can be offered as one of the 3 choices, can decline up to 2 times
4. After 2 declines, boss is your only option

### Reward System by Difficulty

**Easy Encounters (Green)**
- Auto-receive 1 random card (no choice)
- Simplest conditions

**Medium Encounters (Yellow)**
- Pick 1 of 3 cards
- Moderate complexity

**Hard Encounters (Red)**
- Pick 1 of 3 cards
- PLUS pick 1 of 3 bonus rewards (slot upgrade, consumable, card modification)
- Complex conditions

**Boss Encounters (Black)**
- Toughest challenges
- Best rewards (multiple picks or rare items)
- Run ends on defeat

### Failure & Health System

**Slot Lockup = "Health Bar"**
- Failed encounters **lock the slot** with cards trapped inside
- Locked slots cannot be used for new encounters
- Cards in locked encounters are unavailable
- Visual indicator: Red border, chain icon, "LOCKED" label

**Deadlock = Game Over**
- When ALL slots are locked → "DEADLOCK DETECTED - JACK OUT?"
- Player can still use consumables to break free
- If truly stuck with no recovery options, must abort run

**Recovery Mechanics** (via consumables/rewards)
- **Unlock Exploit**: Auto-complete a failed encounter
- **Card Extraction**: Pull cards out of locked encounter without completing it
- **Encounter Breaker**: Destroy locked encounter (permanently lose those cards)
- **Card Obliteration**: Destroy specific cards (might destroy encounter if emptied)

### End-of-Run Systems (Future)
- **Stats screen**: Encounters cleared, cards played, run duration, etc.
- **Meta rewards**: Even failed/jacked-out runs give some progression
- **Achievements**: "Broke a deadlock", "Beat boss with 12-card deck", etc.

### Future Game Modes (Post-MVP)
- **Endless Mode**: See how many encounters you can clear
- **Speed Run**: Time-limited infiltration
- **Challenge Modes**: Special restrictions or modifiers

---

## Core Gameplay Loop (Single Run) - ORIGINAL BRAINSTORM

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

