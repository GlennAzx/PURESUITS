# Mahjong guide review: Sichuan / Where Winds Meet

## 1. Factual errors

| # | Location | Quoted text | Problem | Corrected text |
|---|---|---|---|---|
| F1 | Page summary card (`MahjongGuidePage.jsx:114`), scoring intro (`:360-364`), data header comment (`mahjongGuide.js:8-10`) | "One pattern, the highest you qualify for" / "A winning hand scores as a single pattern" | This is almost certainly wrong. It is also the most damaging error on the page. Sichuan patterns stack, and the multipliers multiply. The game's own "does not count as X" clauses only make sense if patterns stack: under a highest-only rule they would be redundant. The win-condition patterns (Plucking the Moon, Robbing a Kong, Heavenly/Earthly Hand) can't stand alone, because you still need a hand shape to win. Root is a per-root bonus. Confirm with one settlement screenshot (see screenshot 2). | "Patterns multiply together: Pure Suit ×4 with All Pongs ×2 pays ×8. The only exception is where the game says one pattern 'does not count as' another; then the lower one is dropped." |
| F2 | Page, "How a hand wins" caption (`:346-347`) | "Higher-scoring hands use the same four-sets-and-a-pair frame." | False. Seven Pairs, Dragon Pairs, Double/Triple Dragon Pairs and the "with Eyes" pairs hands are seven pairs, with no sets at all. | "Most hands use this four-sets-and-a-pair frame. The exception is the Seven Pairs family, which is seven pairs and nothing else." |
| F3 | Page, "Where the tiles go" (`:294`) | "A pong, kong or chi taken from a discard…" | Sichuan has no Chi claim. You can only take a discard for a Pong, a Kong, or a win. | "A pong or kong taken from a discard is placed face up at that player's right. You can never take a discard to finish a run." |
| F4 | `FIRST_GAME` step 4 | "Whenever you pick one up — from the wall or from a discard —" | You can't claim a discard of your missing suit, because it can't form a set and you can't win on it. Missing-suit tiles only reach you from the wall. | "Whenever you draw one from the wall, it arrives greyed out instead of full colour." |
| F5 | `GLOSSARY` Kong | "A kong counts as a set, with one tile spare." | No tile is spare. The kong is one complete set, and declaring it gives you a replacement draw from the wall. | "Four identical tiles. A kong counts as one set; when you declare it you draw a replacement tile, so you are never a tile short." |
| F6 | `FIRST_GAME` step 6 | "…using at most two suits — which, once your missing suit is gone, is exactly the two suits you kept." | "Exactly" is wrong. One suit is legal, and it is Pure Suit (×4). | "…using only the suits you kept: both of them, or just one for a Pure Suit." |
| F7 | `FIRST_GAME` step 1 | "…then play goes clockwise." | Chinese mahjong, Sichuan included, plays counter-clockwise: the next player is the one on your right. Check this in game before publishing. | "…then play passes to the player on the dealer's right, and continues counter-clockwise." |
| F8 | `SETS` Chi note | "Three consecutive cards in one suit." | This contradicts the game's own definition in `BASICS` and the glossary ("…or three identical tiles"). It also says "cards", not "tiles". | "Three consecutive tiles in one suit, or three identical tiles." |
| F9 | `WINNING` | (no line) | The key Sichuan rule is missing: a win doesn't end the round (blood battle). It only appears indirectly in `END_OF_GAME` line 1. | Add: "Winning does not end the round. Your hand is locked and you sit out, and the others play on until three players have won or the wall is empty." |
| F10 | `WINNING` | "Use at most two suits." | This leaves out the hard constraint. Under the missing-suit rule, the two suits must be the two you kept. | "Use at most two suits, and never your missing suit. You cannot win while holding one." |
| F11 | `GLOSSARY` | "Zi Mou (self draw)" | Wrong romanisation. 自摸 is zì mō. | "Zimo (自摸, self-draw)" |
| F12 | `GLOSSARY` comment | "Only the six terms the table actually uses." | Zimo doesn't appear in the table. "Pung" does (Single-Wait, Dragon Pairs, Double/Triple Dragon Pairs) but isn't defined, and a beginner won't know Pung = Pong. | Add "Pung = Pong" to the Pong entry, or normalise the descriptions to "Pong" and note that the game uses both spellings. |
| F13 | `SCORING` Triple Dragon Pairs with Eyes | "A hand of 2s, 5s and 8s forming Triple Dragon Pairs with Eyes." | Circular: the pattern is defined by its own name. | "A hand of only 2s, 5s and 8s forming Triple Dragon Pairs." |
| F14 | `SCORING` Triple Dragon Pairs with Eyes `excludes` | omits "Triple Dragon Pairs" and "Double Dragon Pairs with Eyes" | The ×128 pattern must override ×32 Triple Dragon Pairs, which it contains. The list is likely a transcription gap. | Add both, after checking the screenshot. |
| F15 | `SCORING` Heavenly Hand | "Winning immediately after the dealer deals the tiles." | Ambiguous about who wins. Only the dealer can win this way. | "The dealer wins on the 14 tiles they were dealt, before discarding anything." |
| F16 | `SCORING` Robbing a Kong | "…robbing the tile another player tries to form a Kong with." | Doesn't say when this can happen: only when a player adds a fourth tile to a Pong already on the table. | "Winning on the tile another player adds to their face-up Pong to upgrade it to a Kong." |
| F17 | `SCORING` Eighteen Arhats | "Single-Wait with four Kong tiles." | Says "four Kong tiles" when it means four Kongs, and doesn't explain why the shown hand has 18 tiles. | "Four declared Kongs plus a pair. Each Kong adds a tile, so the finished hand is 18 tiles." |
| F18 | `SCORING` Root | "Four identical tiles in the hand form a Root." (partial) | The cut-off part is the part that matters. In Sichuan, each Root doubles the score, a declared Kong counts as a Root, and Roots stack with the hand pattern. | Complete it from a fresh screenshot. Until then: "Each set of four identical tiles you hold, including a declared Kong, doubles the score." |
| F19 | `SCORING` Terminal Hand | "Every triplet and sequence includes either a 1 or a 9 tile." | Doesn't cover the pair. In Sichuan the pair must also be 1s or 9s. | "Every set and the pair include a 1 or a 9." (check against game wording) |
| F20 | `END_OF_GAME` line 2 | "…or who is a Flower Pig (holding tiles from all three suits), receives a penalty." | Doesn't say who is paid. Players who aren't ready pay the players who are, and a Flower Pig pays every other player. The Flower Pig definition is also more usable stated directly. | "If the wall runs out, any player not in a Ready Hand pays the players who are. A Flower Pig, a player still holding any tile of their missing suit, pays every other player the maximum." |
| F21 | `BASICS` line 1 | "108 tiles in total: Characters (1-9), Dots (1-9), Bamboo (1-9)." | Doesn't say there are four copies of each tile. Beginners need this to understand Kong, Root and the Dragon Pairs hands. | "108 tiles: Characters, Dots and Bamboo, ranks 1–9, four copies of each." |
| F22 | `BASICS` line 5 | "Any drawn tile from that suit must be discarded." | Leaves out the priority rule the game enforces ("Must clear hand of the designated suit first"). | "Missing-suit tiles must be discarded before any other tile, starting with the ones you were dealt." |

## 2. Hand validation (15 example hands)

Key: C = Characters, D = Dots, B = Bamboo. I checked every hand against the 4-copies-per-tile cap.

| # | Pattern | Sets | Tiles | Suits | Verdict |
|---|---|---|---|---|---|
| 1 | Standard Win | run C1-3, run C2-4, run D1-3, run D4-6, pair D8 | 14 | C, D | **PASS** |
| 2 | Terminal-Free Hand | pong C2, run C2-4, run D2-4, run D4-6, pair D8 | 14 | C, D | **PASS, misleading.** The pong plus the run uses all four C2, which is a Root. Under stacking rules the example also scores Root, so it doesn't isolate the pattern. Change the run to C3-5. |
| 3 | All Pongs | pong C1, C2, D1, D2, pair D3 | 14 | C, D | **PASS** |
| 4 | Seven Pairs | pairs C1, C2, C3, D1, D2, D3, D4 | 14 | C, D | **PASS** |
| 5 | Pure Suit | run C1-3, pong C4, C5, C6, pair C7 | 14 | C | **PASS** |
| 6 | Single-Wait | pong C1, C2, D1, D2, pair D3 | 14 | C, D | **FAIL as an illustration.** The tiles are legal, but the hand is identical to All Pongs (#3). The pattern is defined by all four sets being *declared* (face-up) with one tile left in hand, and the rendering doesn't show that. Visually separate four face-up melds from the concealed tile plus winning tile. |
| 7 | Terminal Hand | pong C1, pong C9, pong B1, run B7-9, pair B9 | 14 (B9 ×3) | C, B | **PASS** |
| 8 | Pairs with Eyes Pung Hand | pong C2, C5, C8, B2, pair B5 | 14 | C, B | **PASS** |
| 9 | Dragon Pairs | four C1, pairs C2, C3, D1, D2, D3 | 14 = 7 pairs | C, D | **PASS on tiles.** The four C1 are drawn with the `kong` helper, so they look like a Kong, but the description says "Cannot be formed by declared Kongs". Label them "four in hand, not declared". |
| 10 | Double Dragon Pairs | four C1, four C2, pairs C3, C4, C7 | 14 = 7 pairs | C only | **PASS, misleading.** Single suit, so it is also Pure Suit (×4). It doesn't isolate the pattern. Move two pairs to Dots. |
| 11 | Pairs with Eyes | four C2, pairs C5, C8, B2, B5, B8 | 14 = 7 pairs | C, B | **PASS.** The four of a kind can't be avoided: two suits give only six distinct 2/5/8 tiles, so seven pairs needs a doubled pair. This hand therefore always also meets Dragon Pairs and Root, yet `excludes` lists neither. Either the exclusion list is incomplete or they stack. Check the source. |
| 12 | Triple Dragon Pairs | four C1, four C2, four C3, pair C7 | 14 = 7 pairs | C only | **PASS, misleading.** Also Pure Suit. Move one four of a kind to Dots. |
| 13 | Double Dragon Pairs with Eyes | four C2, four C5, pairs B2, B5, B8 | 14 = 7 pairs | C, B | **PASS** |
| 14 | Eighteen Arhats | kong C1, C2, D1, D2, pair D3 | 18 | C, D | **PASS.** 18 tiles is correct for four Kongs, but nothing on the page says so, and a beginner will think it's a typo (see F17). |
| 15 | Triple Dragon Pairs with Eyes | four C2, four C5, four B2, pair B8 | 14 = 7 pairs | C, B | **PASS** |

No hand uses a tile outside the 108-tile set, goes past rank 9, uses more than two suits, or holds more than four copies of a tile. Three hands are wrong as teaching examples: #6 is identical to #3, and #2, #10 and #12 also qualify for a second pattern. #9, #11 and #14 need a note explaining their tile counts or grouping.

The page's own `EXAMPLE_HAND` (runs B2-4, B5-7, D7-9, pong D1, pair D5) has 14 tiles across B and D. **PASS.**

## 3. Beginner gaps

1. **The turn loop is never stated as a loop.** Add: "On your turn: draw one tile from the wall, then discard one. If you can win or declare a Kong, a button appears before you discard."
2. **Turn timer.** Never mentioned. State how long you have and what happens on timeout (auto-discard of the drawn tile is typical; check).
3. **What happens when someone claims your discard.** Nothing says that the claimer takes it, reveals the set, discards, and that play then continues from *their* right, skipping anyone in between.
4. **Can I take a discard for a run?** Never said explicitly. "No Chi from discards" should be a bold line. F3 currently tells beginners the opposite.
5. **Two players want the same discard.** Not covered. The rule is: a win beats a Pong or Kong, and if several players can win on it, all of them win (only one line hints at this). Pong vs Pong can't happen with four copies.
6. **How the claim prompt works.** The Hu / Pong / Kong / Pass buttons, and the fact that you have seconds to respond.
7. **Kong types.** Robbing a Kong depends on knowing the three kinds of Kong: concealed (all four drawn), exposed (from a discard), and added (fourth tile added to your own Pong). None is described.
8. **Kong payments.** Sichuan normally pays Kongs immediately (concealed Kongs from everyone; exposed Kongs from the discarder). Unstated. Check whether WWM does this.
9. **Who pays on a win.** Win on a discard: the discarder alone pays. Self-draw: every player still in the round pays. Missing entirely.
10. **What multipliers multiply.** ×4 of what? No base stake, chip value or cap is given. "Chips refresh at the end of each round" is meaningless to a newcomer.
11. **After you win.** Blood battle: your hand locks, you stop playing, and you can still collect when others lose. Missing (F9).
12. **Who deals next.** Not covered (usually the first winner; if one discard produced several wins, the discarder). Check.
13. **Ready Hand.** The glossary defines it, but nothing explains why it matters before the wall-empty penalty.
14. **What you see on screen.** The page never mentions the drawn-tile slot, the claim buttons, how a winner is marked, or the settlement panel.
15. **Strategy floor.** One line would stop most first-game losses: "Don't discard a tile the next player obviously wants. Early on, discard isolated 1s and 9s first."

## 4. Ordering and structure

Current order: Summary card → Your first game → Words you will hear → Basic rules → The tiles → Three suits / Three sets → Where the tiles go → How a hand wins → Scoring → End of the round.

Problems:
- **"Your first game" comes before any definitions.** It uses "pong", "kong", "four sets and a pair" and "dealer" before the reader has seen a tile.
- **Pong, Chi and Kong are defined three times** (`BASICS`, `SETS`, `GLOSSARY`), and the definitions contradict each other (F8).
- **"The tiles" and "The three suits" are two sections for one fact.**
- **"Basic rules" adds nothing.** All five lines repeat other sections.
- **"End of the round" comes after Scoring.** But blood battle and the wall-empty penalty are how the game flows, not reference material.
- **Scoring is the longest section and sits in the middle.** It is reference material, not onboarding.

Proposed order:
1. Summary card (with F1 fixed: "Patterns multiply").
2. **Tiles & sets**: merge "The tiles", "The three suits", "The three sets" and the Pong/Chi/Kong glossary entries. Cut "Basic rules".
3. **How a hand wins**: add the blood-battle line and the Seven Pairs exception.
4. **Your first game**: missing suit plus the turn loop, claims, and the win button.
5. **Where the tiles go / what you see**.
6. **End of the round & who pays**: wall-empty, Flower Pig, win payments.
7. **Scoring**: reference table.
8. Glossary, cut down to Discard, Ready Hand, Zimo and Pung=Pong, at the bottom or as inline tooltips.

## 5. Screenshot shortlist

1. **Settlement screen after a win.** It must show the pattern names listed, the individual multipliers, the combined total, and the chips moving from each paying player. This settles F1 (stacking vs highest-only) and gap 9.
2. **Claim prompt on an opponent's discard.** The discard visible in the centre, the Pong / Kong / Hu / Pass buttons, and the countdown timer.
3. **Blood battle in progress.** One player marked as won (hand laid down or badge shown) while the other three still have hands and the wall is still going.
4. **Your own turn.** The newly drawn tile separated at the right of your hand, the turn timer, and, if there is one, the self-draw Hu or Kong button.
5. **Wall-empty settlement.** The Ready Hand check and a Flower Pig penalty line, with names and amounts.
6. **An added Kong on the table.** A face-up Pong upgraded to four tiles, ideally next to a concealed Kong (two face-down end tiles). This explains Robbing a Kong and the Kong types in one image.

## 6. Top 10 edits

1. Summary card `['Scoring', 'One pattern, the highest you qualify for']` → `['Scoring', 'Patterns multiply, unless the game says one replaces another']`
2. Scoring intro "A winning hand scores as a single pattern. Where the rules say a pattern "does not count as" another, the game has already ruled out the lower one, so you take the highest pattern the hand qualifies for." → "A winning hand can match several patterns, and their multipliers multiply. Where the game says a pattern 'does not count as' another, only the higher one is scored."
3. `WINNING`: add the line "Winning does not end the round. You stop playing, and the others continue until three players have won or the wall is empty."
4. "A pong, kong or chi taken from a discard is placed face up at that player's right." → "A pong or kong taken from a discard is placed face up at that player's right. You can never take a discard to finish a run."
5. Step 6 "Draw a tile, or take another player's discard to complete a pong or a kong, then discard one. Build four sets and a pair using at most two suits — which, once your missing suit is gone, is exactly the two suits you kept." → "On your turn, draw one tile from the wall and discard one. When another player discards, you may take that tile only to complete a pong, a kong, or your winning hand. Build four sets and a pair from the suits you kept: both, or just one."
6. "Higher-scoring hands use the same four-sets-and-a-pair frame." → "Most hands use this frame. The Seven Pairs family is the exception: seven pairs and no sets."
7. Kong glossary "A kong counts as a set, with one tile spare." → "Four identical tiles. It counts as one set, and declaring it gives you a replacement draw from the wall."
8. Step 4 "Whenever you pick one up — from the wall or from a discard — the tile is drawn greyed out instead of full colour." → "Whenever you draw one from the wall, it arrives greyed out instead of full colour."
9. `END_OF_GAME` "If the wall runs out, any player who is not in a Ready Hand (one tile away from winning), or who is a Flower Pig (holding tiles from all three suits), receives a penalty." → "If the wall runs out, players who are not one tile from winning pay those who are. A Flower Pig, a player still holding a tile of their missing suit, pays every other player the maximum."
10. Step 1 "The dealer holds one extra tile and discards first, then play goes clockwise." → "The dealer holds one extra tile and discards first. Play then passes to the right, counter-clockwise." (check the direction in game first)
