/**
 * Sichuan mahjong rules, transcribed from the in-game guide.
 *
 * Source: twelve screenshots of the game's own rule pages. Two further
 * screenshots in that batch were guild chat and contained no rules.
 *
 * Descriptions are kept close to the game's wording. Where the game adds a
 * clause about a pattern not stacking ("Does not count as All Pongs"), it is
 * kept, because that clause is the rule: a hand scores as ONE pattern, the
 * highest it qualifies for.
 */

/** The five rules the game states up front. */
export const BASICS = [
  '108 tiles: Characters, Dots and Bamboo, ranks 1 to 9, four copies of each.',
  'Chi: a set of 3 tiles — three consecutive tiles in one suit, or three identical tiles.',
  'Pong: using a tile discarded by another player to complete a set of 3 identical tiles with your hand.',
  'Kong: 4 identical tiles.',
  'Declare Missing Suit: at the start, each player declares one suit as their missing suit. Its tiles are dead to you: they cannot form a set, and you cannot win while holding one. Clear them first, before any other discard. The choice cannot be changed during the round.',
];

/** Three suits, and the three shapes a set can take. */
export const SUITS = [
  { name: 'Bamboo', note: 'Runs 1-9. Green sticks.' },
  { name: 'Characters', note: 'Runs 1-9. Also labelled Ten Thousand (萬).' },
  { name: 'Dots', note: 'Runs 1-9. Circles.' },
];

export const SETS = [
  { name: 'Chi', note: 'Three consecutive tiles in one suit.' },
  { name: 'Pong', note: 'Three of a kind.' },
  { name: 'Kong', note: 'Four of a kind.' },
];

export const WINNING = [
  'Make four sets and one pair.',
  'Use at most two suits, and never your missing suit. You cannot win while holding one.',
  'A set is either three of a kind or a straight of three.',
  'The pair is two tiles of the same rank.',
  'Multiple players can win from the same discard.',
  'Winning does not end the round. You stop playing, and the other players carry on until three have won or the wall is empty.',
];

/**
 * Every scoring pattern the guide lists, ascending by multiplier.
 *
 * `excludes` is the game's own "does not count as" clause, pulled out so it can
 * be shown as a tag instead of buried in the sentence.
 */
// Set builders. Each returns a flat array of tiles, so a hand is an array of
// sets: [run(...), pong(...), pair(...)]. Keeping them flat matters — nesting
// them produced hands that silently rendered as the wrong tiles.
const run = (suit, from) => [0, 1, 2].map((i) => ({ suit, rank: from + i }));
const pong = (suit, rank) => Array.from({ length: 3 }, () => ({ suit, rank }));
const kong = (suit, rank) => Array.from({ length: 4 }, () => ({ suit, rank }));
const pair = (suit, rank) => Array.from({ length: 2 }, () => ({ suit, rank }));

export const SCORING = [
  {
    mult: 1,
    name: 'Standard Win',
    desc: 'Four sets of triplets or sequences, and a pair.',
    sets: [run('characters',1),run('characters',2),run('dots',1),run('dots',4),pair('dots',8)],
    excludes: [],
  },
  {
    mult: 2,
    name: 'Plucking the Moon from the Sea',
    desc: 'Winning by drawing the last tile from the wall.',
    excludes: [],
  },
  {
    mult: 2,
    name: 'Terminal-Free Hand',
    desc: 'Winning without any 1s or 9s in the hand.',
    sets: [pong('characters',2),run('characters',2),run('dots',2),run('dots',4),pair('dots',8)],
    excludes: [],
  },
  {
    mult: 2,
    name: 'Robbing a Kong',
    desc: 'Winning on the tile another player adds to their face-up Pong to upgrade it to a Kong.',
    excludes: [],
  },
  {
    mult: 2,
    name: 'All Pongs',
    desc: 'Four triplets or quads, and one pair.',
    sets: [pong('characters',1),pong('characters',2),pong('dots',1),pong('dots',2),pair('dots',3)],
    excludes: [],
  },
  {
    mult: 2,
    name: 'Root',
    desc: 'Four identical tiles in the hand form a Root.',
    excludes: [],
    // The screenshot cuts off mid-sentence here; only the first clause is quoted.
    partial: true,
  },
  {
    mult: 4,
    name: 'Seven Pairs',
    desc: 'Winning with seven pairs.',
    sets: [pair('characters',1),pair('characters',2),pair('characters',3),pair('dots',1),pair('dots',2),pair('dots',3),pair('dots',4)],
    excludes: [],
  },
  {
    mult: 4,
    name: 'Pure Suit',
    desc: 'A hand composed entirely of one suit: Characters, Dots, or Bamboos.',
    sets: [run('characters',1),pong('characters',4),pong('characters',5),pong('characters',6),pair('characters',7)],
    excludes: [],
  },
  {
    mult: 4,
    name: 'Single-Wait',
    desc: 'At the time of winning every other tile has been declared as a Pung or Kong, so only one tile remains in hand.',
    sets: [pong('characters',1),pong('characters',2),pong('dots',1),pong('dots',2),pair('dots',3)],
    excludes: ['All Pongs'],
  },
  {
    mult: 4,
    name: 'Terminal Hand',
    desc: 'Every triplet and sequence must include a 1 or a 9 tile.',
    sets: [pong('characters',1),pong('characters',9),pong('bamboo',1),run('bamboo',7),pair('bamboo',9)],
    excludes: [],
  },
  {
    mult: 8,
    name: 'Pairs with Eyes Pung Hand',
    desc: 'A Pong hand composed entirely of 2s, 5s and 8s.',
    sets: [pong('characters',2),pong('characters',5),pong('characters',8),pong('bamboo',2),pair('bamboo',5)],
    excludes: ['All Pongs'],
  },
  {
    mult: 8,
    name: 'Dragon Pairs',
    desc: 'Seven pairs including one group of four identical tiles. Cannot be formed by declared Pungs or Kongs.',
    sets: [kong('characters',1),pair('characters',2),pair('characters',3),pair('dots',1),pair('dots',2),pair('dots',3)],
    excludes: ['Seven Pairs', 'Root'],
  },
  {
    mult: 16,
    name: 'Double Dragon Pairs',
    desc: 'Seven pairs including two groups of four identical tiles. Cannot be formed by declared Pungs or Kongs.',
    sets: [kong('characters',1),kong('characters',2),pair('characters',3),pair('characters',4),pair('characters',7)],
    excludes: ['Seven Pairs', 'Dragon Pairs', 'Root'],
  },
  {
    mult: 16,
    name: 'Pairs with Eyes',
    desc: 'Seven pairs composed entirely of 2s, 5s and 8s.',
    sets: [kong('characters',2),pair('characters',5),pair('characters',8),pair('bamboo',2),pair('bamboo',5),pair('bamboo',8)],
    excludes: ['Seven Pairs', 'Terminal-Free Hand'],
  },
  {
    mult: 32,
    name: 'Triple Dragon Pairs',
    desc: 'Seven pairs with three groups of four identical tiles. Cannot be formed by declared Kongs or Pungs.',
    sets: [kong('characters',1),kong('characters',2),kong('characters',3),pair('characters',7)],
    excludes: ['Seven Pairs', 'Dragon Pairs', 'Double Dragon Pairs', 'Root'],
  },
  {
    mult: 32,
    name: 'Heavenly Hand',
    desc: 'The dealer wins on the fourteen tiles they were dealt, before discarding anything.',
    excludes: [],
  },
  {
    mult: 32,
    name: 'Earthly Hand',
    desc: 'A non-dealer wins by drawing on their first turn.',
    excludes: [],
  },
  {
    mult: 64,
    name: 'Double Dragon Pairs with Eyes',
    desc: 'A hand of 2s, 5s and 8s forming Double Dragon Pairs.',
    sets: [kong('characters',2),kong('characters',5),pair('bamboo',2),pair('bamboo',5),pair('bamboo',8)],
    excludes: [
      'Seven Pairs',
      'Pairs with Eyes',
      'Dragon Pairs',
      'Double Dragon Pairs',
      'Root',
      'Terminal-Free Hand',
    ],
  },
  {
    mult: 64,
    name: 'Eighteen Arhats',
    desc: 'Four declared Kongs plus a pair. Each Kong adds a tile, so the finished hand is eighteen tiles.',
    sets: [kong('characters',1),kong('characters',2),kong('dots',1),kong('dots',2),pair('dots',3)],
    excludes: ['Root', 'Single-Wait', 'All Pongs'],
  },
  {
    mult: 128,
    name: 'Triple Dragon Pairs with Eyes',
    desc: 'A hand of only 2s, 5s and 8s, forming three groups of four plus a pair.',
    sets: [kong('characters',2),kong('characters',5),kong('bamboo',2),pair('bamboo',8)],
    excludes: [
      'Seven Pairs',
      'Pairs with Eyes',
      'Dragon Pairs',
      'Double Dragon Pairs',
      'Root',
      'Terminal-Free Hand',
    ],
  },
];

/** How a round finishes, and who pays. */
export const END_OF_GAME = [
  'The game ends when three players have a winning hand, or when all tiles are drawn.',
  'If the wall runs out, any player who is not in a Ready Hand (one tile away from winning), or who is a Flower Pig (holding tiles from all three suits), receives a penalty.',
  'Chips refresh at the end of each round.',
];


/**
 * First-game walkthrough.
 *
 * Everything here is either stated by the game itself or visible on screen:
 * the "Choose Your Missing Suit" panel with its recommendation, the greyed
 * tiles in hand, and the prompt "Must clear hand of the designated suit first".
 */
export const FIRST_GAME = [
  {
    step: '1',
    title: 'You start with 13 tiles',
    body: 'The other three players are doing the same. The dealer holds one extra tile and discards first. After that the turn passes on around the table.',
  },
  {
    step: '2',
    title: 'First decision: declare your missing suit',
    body: 'Before any tile is played, the game asks you to choose one suit as your missing suit: Ten Thousand, Dot or Bamboo. The panel says "We recommend selecting a smaller amount of colors" — pick the suit you hold the fewest of, because every tile of it in your hand is a tile you cannot use. You cannot change this choice for the rest of the round.',
    callout: 'Choose Your Missing Suit',
  },
  {
    step: '3',
    title: 'That suit is dead to you',
    body: 'A tile of your missing suit cannot be part of a set or a pair, and you cannot win while you still hold one. Plan as though that suit does not exist.',
  },
  {
    step: '4',
    title: 'Drawn tiles of it arrive grey',
    body: 'Whenever you draw one from the wall, it arrives greyed out instead of full colour. That grey is the game telling you it is unusable. Discard it at the first opportunity.',
    callout: 'Must clear hand of the designated suit first',
  },
  {
    step: '5',
    title: 'Keep the hand clear',
    body: 'The prompt stays up while your hand still holds tiles of the missing suit. Clear them all as early as you can: until you do, you are not a threat and you cannot win.',
  },
  {
    step: '6',
    title: 'Then play normally',
    body: 'On your turn, draw one tile from the wall and discard one. When another player discards, you may take that tile only to complete a pong, a kong, or your winning hand. Build four sets and a pair from the suits you kept: both of them, or just one.',
  },
];


/** Plain-language glossary. Only the six terms the table actually uses. */
export const GLOSSARY = [
  { term: 'Discard', meaning: 'The tile you throw away at the end of your turn. Other players may take it.' },
  {
    term: 'Pong',
    meaning: "Three identical tiles. You may take another player's discard to complete one. The game also spells this Pung.",
    tiles: [{ suit: 'dots', rank: 5 }, { suit: 'dots', rank: 5 }, { suit: 'dots', rank: 5 }],
  },
  {
    term: 'Chi',
    meaning: 'Three consecutive tiles in one suit.',
    tiles: [{ suit: 'bamboo', rank: 5 }, { suit: 'bamboo', rank: 6 }, { suit: 'bamboo', rank: 7 }],
  },
  {
    term: 'Kong',
    meaning: 'Four identical tiles. It counts as one set, and declaring it gives you a replacement draw from the wall.',
    tiles: [
      { suit: 'characters', rank: 3 }, { suit: 'characters', rank: 3 },
      { suit: 'characters', rank: 3 }, { suit: 'characters', rank: 3 },
    ],
  },
  { term: 'Ready Hand', meaning: 'One tile away from winning.' },
  { term: 'Zi Mou (self draw)', meaning: 'Winning on a tile you drew yourself, rather than one taken from a discard.' },
];
