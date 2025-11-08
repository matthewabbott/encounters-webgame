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

---

# DESIGN EVOLUTION: Trick-Taking as Primary Encounter Type

**Status**: Major design pivot under consideration
**Date**: 2025-01-08

## The Vision

Move from diverse encounter categories (sum, sequence, collection, etc.) to **trick-taking as the primary or even sole encounter type**. This unifies the game around a single, deeply strategic core mechanic.

## Why Trick-Taking?

1. **Deep strategic space**: Trick-taking games (Euchre, Hearts, Bridge) have centuries of proven depth
2. **Deterministic puzzles**: With face-up opponent hands, each encounter becomes a solvable puzzle
3. **Deck sculpting synergy**: The core loop of "modify deck → solve puzzle" is perfectly suited to trick-taking
4. **Interplay between systems**: Use encounters to shape deck for other encounters
5. **Accessible complexity**: Simple to understand, hard to master

## Core Trick-Taking Encounter

### Setup
- **Player hand**: 5 cards drawn from deck
- **Opponent(s)**: 1-3 opponents with **face-up hands** (deterministic puzzle)
- **AI behavior**: Simple, visually indicated rules
- **Win condition**: Take exactly X tricks, at least X tricks, fewer than X tricks

### AI Behavior System

**Visual Border Indicators:**
- **No Border (Neutral)**: Plays leftmost card
- **Red Border (Aggressive)**: ALWAYS plays if it would win the trick
  - Will skip over leftmost cards to play red-bordered card that wins
  - Forces maximum trick-taking
- **Blue Border (Passive)**: NEVER voluntarily wins tricks
  - Will play if it won't win
  - Only wins if forced (all remaining cards are blue, or must follow suit)

**Why This Works:**
- Completely deterministic (no randomness once cards are dealt)
- Visual language makes AI readable at a glance
- Creates puzzle scenarios: "How do I sequence my cards to take exactly 3 tricks?"
- Different AI personalities via border distributions

### The Puzzle Question

Every encounter asks: **"Given these 5 cards and this opponent hand, can you win?"**

**When you CAN win:**
- Solve the puzzle by sequencing cards correctly
- Collect rewards
- Unlock new map slots

**When you CAN'T win:**
- **Option 1 - Use consumables**: Modify cards/hands to enable victory
- **Option 2 - Abort**: Unslot encounter (limited resource), remain "open" (not locked)
- **Option 3 - Mulligan**: Tuck current 5 to bottom, draw new top 5 (requires deck sculpting!)
- **Option 4 - Sculpt deck**: Complete OTHER encounters to modify deck, then return
- **Option 5 - Gamble**: Try anyway, fail and lock the encounter (harder to recover)

### Face-Up vs Face-Down

**Face-Up Opponent (Default):**
- You can see all opponent cards
- Know if you can win before committing
- Pure deterministic puzzle

**Face-Down Opponent (Risk/Reward variant):**
- Opponent hand hidden
- Can't tell if winnable
- Higher risk: might fail and lock encounter
- Higher reward: better prizes if you win the gamble

## Encounters as Resources

**Key Insight**: Encounters become tools to help you win OTHER encounters.

**Example Flow:**
1. Enter Encounter A with current hand → Can't win
2. Don't abort! Instead:
   - Go complete Encounter B (destroy specific high card)
   - Complete Encounter C (duplicate useful mid-range card)
   - Get consumable from reward (modify a card value)
3. Now your deck is sculpted differently
4. Return to Encounter A, use mulligan to get new 5 cards
5. New hand can win the puzzle!

**This creates incredible strategic depth:**
- Long-term planning across multiple encounters
- Deck composition as evolving puzzle state
- "Solve encounters to solve encounters"

## Mulligan & Redraw System

### Mulligan Mechanic
- **Action**: Tuck current 5 cards to bottom of deck, draw new top 5
- **Limited uses**: Maybe 2-3 per run, or per encounter (varies by starter deck)
- **Requires setup**: Only effective if you've sculpted top of deck via other encounters
- **Strategic timing**: When to mulligan vs when to modify deck more?

### Interaction with Deck State
- If you haven't modified deck, mulligan just gives you random 5
- If you've destroyed specific cards, your new draw excludes them
- If you've duplicated cards, more likely to draw them
- If you've used "stack deck" consumable, you KNOW what you'll draw

**This makes deck sculpting CRUCIAL** - you're not just making deck "better," you're creating specific draws.

## Undo System

**Within-Encounter Undo:**
- Rewind individual tricks
- See "what if I had played this card instead?"
- Limited uses (3 undos per encounter?)

**Resource Differentiation:**
- Different starter decks trade resources:
  - **Beginner deck**: 3 undos, 1 mulligan, 2 aborts
  - **Advanced deck**: 1 undo, 3 mulligans, 1 abort
  - **Speedrun deck**: 0 undos, 0 mulligans, 5 aborts (just skip hard ones!)

**Possible Consumable:**
- ICE that grants extra undos?
- Or undo might be built-in to maintain accessibility

## Abort System

**Abort Action:**
- Remove encounter from slot without penalty
- Encounter returns to "unplaced" state (not locked)
- Slot becomes available again
- **Limited resource**: Maybe 2-3 per run

**Use Cases:**
- "I drew a terrible hand and don't want to waste mulligan"
- "This encounter is harder than I thought"
- "I need this slot for something else"

**Strategic Layer:**
- Aborts are precious, use wisely
- Sometimes better to mulligan or sculpt deck
- Sometimes better to just take the loss and lock encounter (if you don't need those cards)

## Consumables: Scripts & Programs

### Theme: Vulnerabilities & Exploits

By completing encounters (or finding them on map), you **open vulnerabilities** in the system. Through these vulnerabilities, you can **run scripts** to achieve specific effects.

**Narrative**: You're a netrunner deploying payloads through security holes you've created.

### Script Categories

#### 1. Deck Manipulation (Permanent Effects)
- `duplicate.bat` - Copy a card permanently
- `corrupt.sh` - Destroy a card permanently
- `modify.py` - Change card value by ±N permanently
- `recolor.exe` - Change card suit/color permanently
- `stack.exe` - Arrange top X cards in chosen order
- `mark.sh` - "Mark" cards so you know when they're coming

#### 2. In-Encounter Scripts
- `swap.sh` - Swap your card with opponent's
- `discard.exe` - Force opponent to discard X cards
- `peek.py` - Reveal face-down opponent cards
- `redraw.exe` - Redraw X cards from your hand

#### 3. Meta Scripts (Modifiers)
- `overload.bat` - **Next script affects ALL cards in hand**
  - `overload.bat` + `duplicate.bat` = copy entire hand
  - `overload.bat` + `corrupt.sh` = destroy entire hand
  - `overload.bat` + `modify.py +2` = boost all cards by +2
  - Incredibly powerful combo system!

#### 4. World Scripts (Map Interaction)
- `breach.exe` - Destroy barrier on map
- `backdoor.sh` - Unlock alternate path
- `decrypt.exe` - Reveal hidden map area
- `scan.py` - Preview encounter before placing

**Implementation Priority**: Start with deck manipulation + overload. Add others later.

## Map as Interactive World

### Current State
- Tree-based slot generation
- Slots unlock after completing encounters
- Purely functional (slots are just containers)

### Future Vision: Meaningful Navigation

**Obstacles:**
- **Barriers**: Block paths, require `breach.exe` or specific card destruction
- **Locks**: Require specific card values/suits to pass
- **ICE Walls**: Need specific scripts to bypass

**Resources:**
- **Card Nodes**: Free-floating cards you can add to deck
- **Script Caches**: Find consumable programs
- **Shops**: Nodes where you pay cards to sculpt deck (add/swap/destroy)

**Meta-Interactions** (Advanced):
Powers work BOTH in encounters AND on world map:
- `corrupt.sh` destroys card in encounter OR destroys barrier on map
- `modify.py` changes card value OR changes lock combination
- `swap.sh` swaps with opponent in encounter OR swaps cards with shop

**Creates Navigation Choices:**
- "Do I take the path with 3 easy encounters or 1 hard encounter + shop?"
- "Should I destroy this barrier or save my `breach.exe` for later?"
- "I need card X from this shop, but do I want to sacrifice card Y for it?"

## Future Mechanics (Parking Lot)

### Daemons
- **Persistent effects** that trigger automatically
- Example: "Next time you would lose a trick, win it instead" (triggers once, then deletes)
- Example: "Whenever opponent plays red card, you draw a card" (persistent)
- **Strategic planning**: Set up daemons, then trigger them tactically

### ICE Breakers
- **Encounter-type specific tools** (like Netrunner TCG)
- Different breakers for different encounter variants
- **Renewable resources**: Each breaker gives 3 uses per run?
- **Build differentiation**: Choose which breakers to bring

### Chips / Hardware
- **Permanent upgrades** for the run
- +1 hand size
- +1 script slot
- Passive abilities (draw extra card after winning encounter)

### Neural Augments / Starter Decks
- Different starting configurations
- Different resource budgets (undos vs mulligans vs aborts)
- Different starting scripts
- Different win conditions or restrictions

## Trick-Taking Variants (Future Expansion)

### Lead Mechanics
- **Steal Lead**: You always play first in trick
- **Drop Lead**: Opponent always plays first
- Consumables or encounter modifiers

### Trump Mechanics
- **Trump Suit**: One suit beats all others
- **Set Trump**: Choose trump suit
- **Remove Trump**: Eliminate trump from game
- **Wildcard Cards**: Always trump, must be played

### Multi-Opponent
- Face 2-3 opponents simultaneously
- Each with different AI behavior (one aggressive, one passive)
- Must navigate multiple strategies
- Higher difficulty, better rewards

### Special Win Conditions
- Win **exactly** X tricks (not "at least")
- Win without using specific suit
- Win with hand size reduced (play with 3 cards instead of 5)
- Win while opponent plays face-down (blind puzzle!)

## Two Game Modes

### Roguelite Mode (Primary Focus)
- Procedurally generated maps
- Build deck over course of run
- Permanent upgrades and unlocks between runs
- Beat boss to complete run
- Meta-progression (unlock new starters, scripts, etc.)

### Puzzle Mode (Future)
- **Handcrafted scenarios** with fixed everything:
  - Fixed deck composition
  - Fixed encounter layouts
  - Fixed opponent hands
  - Fixed starting resources (scripts, mulligans, undos)
- **Goal**: Figure out the sequence of actions to beat all encounters
- **"Into the Breach meets Balatro"**
- Optional bonus objectives for replayability
- Daily/weekly challenges
- Leaderboards for speed or efficiency

**Puzzle Mode Benefits:**
- Tutorial levels (teach mechanics in controlled environment)
- Test your understanding without RNG
- Share puzzles with community
- "Can you beat this in 5 encounters?" challenges

## Open Design Questions

### 1. Encounter Type Mix
- **Option A**: Trick-taking is THE ONLY encounter type
  - All depth from variants (multi-opponent, trump, lead, etc.)
  - Unified experience
- **Option B**: Trick-taking is PRIMARY, but sum/sequence exist as occasional variants
  - More variety, less focus
  - Could repurpose existing code

**Recommendation**: Start with Option A. Commit to the vision fully.

### 2. Vulnerability System
How do players acquire scripts?
- **Option A**: Automatic from encounter rewards
- **Option B**: Must "open vulnerability" first (special encounters or map nodes)
- **Option C**: Scripts are found/purchased, vulnerabilities are just thematic

**Recommendation**: Option A for MVP. Thematic fluff can come later.

### 3. Resource Budgets
How many of each resource?
- Mulligans per run: 2-3?
- Undos per encounter: 3?
- Aborts per run: 2?
- Script slots: 3-5?

**Needs playtesting** - too many makes it too easy, too few makes it frustrating.

### 4. Starter Deck Differentiation
How different should starters be?
- **Shallow**: Just different resource budgets
- **Medium**: Different card distributions (high cards vs low cards vs balanced)
- **Deep**: Completely different mechanics (one uses daemons, one uses ICE, etc.)

**Recommendation**: Start shallow (just resources), expand to medium, deep is post-launch.

### 5. Map Integration Timeline
When to add world navigation features?
- **MVP**: Just basic slot unlocking
- **Phase 2**: Card nodes and shops
- **Phase 3**: Barriers and obstacles
- **Phase 4**: Meta-interactions (scripts work on map)

**Recommendation**: MVP first, don't get distracted by fancy map stuff yet.

## Implementation Roadmap

### Phase 1: Core Trick-Taking ✋ (NEXT PRIORITY)
- [ ] Implement basic trick-taking encounter type
- [ ] 1v1 opponent with simple AI
- [ ] Face-up opponent hands (deterministic)
- [ ] Border-based AI behavior (red/blue/neutral)
- [ ] Win X tricks condition
- [ ] Visual polish (clear trick winners, score display)

### Phase 2: Deck Interaction
- [ ] Mulligan system (tuck 5, draw new 5)
- [ ] Mulligan counter (limited uses)
- [ ] Abort system (remove from slot)
- [ ] Deck state affects mulligan results

### Phase 3: Basic Consumables
- [ ] Script slot system (hold 3-5 scripts)
- [ ] Deck manipulation scripts (duplicate, corrupt, modify)
- [ ] Script rewards from encounters
- [ ] Script usage during encounters

### Phase 4: Advanced Consumables
- [ ] Overload meta-script (apply to all cards)
- [ ] In-encounter scripts (swap, discard, redraw)
- [ ] Combo system (overload + others)

### Phase 5: Undo System
- [ ] Undo button in encounters
- [ ] Undo counter (3 per encounter?)
- [ ] History tracking for rewind
- [ ] Visual feedback on undo

### Phase 6: Difficulty Variants
- [ ] Face-down opponents (gambling)
- [ ] Multi-opponent encounters
- [ ] Different win conditions (exactly X, fewer than X, etc.)
- [ ] Trump/lead mechanics

### Phase 7: Map Evolution
- [ ] Card nodes on map
- [ ] Shop nodes
- [ ] Barriers requiring scripts

### Phase 8: Puzzle Mode
- [ ] Scenario system (fixed decks/encounters)
- [ ] Puzzle editor (for creating scenarios)
- [ ] Daily challenges
- [ ] Sharing system

## Design Principles Moving Forward

1. **Commit to the vision**: Trick-taking is the core. Don't dilute it.

2. **Interplay between systems**: Every mechanic should interact with others meaningfully.

3. **Deterministic puzzles**: Players should be able to see and solve puzzles with perfect information.

4. **Deck sculpting is key**: The game is about building the right deck to solve specific puzzles.

5. **Encounters as resources**: Use encounters to help you beat other encounters.

6. **Netrunner fantasy**: Everything should feel like hacking - scripts, vulnerabilities, exploits.

7. **Accessibility through depth**: Simple to learn (win X tricks), hard to master (deck sculpting across multiple encounters).

## Conclusion

This is a **significant evolution** from the original "category soup" design. We're pivoting to **deep mastery of a single mechanic** (trick-taking) rather than shallow coverage of many mechanics.

The result should be:
- **More focused** gameplay loop
- **Deeper** strategic space
- **Clearer** identity (it's a deck-building trick-taking roguelite puzzle game)
- **Stronger** theme integration (netrunner running scripts through vulnerabilities)

The interplay between deck sculpting, mulligans, encounter sequencing, and consumable usage creates a unique strategic experience that doesn't exist in other games.

**Next step**: Implement basic trick-taking encounter (Phase 1) and playtest to validate the core loop.

