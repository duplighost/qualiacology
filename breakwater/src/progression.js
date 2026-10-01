// Constellation coordinates are normalized to a 0–100 square.
// Every route is traversable with the starting movement kit.
export const SKILLS = [
  {
    id: 'catchdrive', name: 'Catch Drive', branch: 'momentum', cost: 1,
    requires: [], x: 38, y: 38,
    description: 'A perfect catch immediately restores your dash. Throw, move, catch, and move again.'
  },
  {
    id: 'slidevault', name: 'Slipstream', branch: 'momentum', cost: 1,
    requires: ['catchdrive'], x: 27, y: 30,
    description: 'Kill while sliding to spring into a low aerial vault without losing forward speed.'
  },
  {
    id: 'airpull', name: 'Towline', branch: 'momentum', cost: 1,
    requires: ['slidevault'], x: 18, y: 18,
    description: 'Recall while moving in the air to pull yourself forward. Release movement to keep a quiet catch.'
  },
  {
    id: 'wake', name: 'Breaking Wake', branch: 'momentum', cost: 1,
    requires: ['airpull'], x: 34, y: 10,
    description: 'Your dash cuts through nearby enemies. Turn an escape into a finishing move.'
  },
  {
    id: 'breaker', name: 'Backbreaker', branch: 'vector', cost: 1,
    requires: [], x: 62, y: 38,
    description: 'Returning lance hits break defensive shields. Put the lance behind a guard, then call it home.'
  },
  {
    id: 'drag', name: 'Undertow', branch: 'vector', cost: 1,
    requires: ['breaker'], x: 73, y: 30,
    description: 'Your returning lance draws nearby light enemies into its path. Pull a formation together before the next hit.'
  },
  {
    id: 'pin', name: 'Hardpoint', branch: 'vector', cost: 1,
    requires: ['drag'], x: 82, y: 18,
    description: 'Fully charged throws briefly stun heavy machines and bosses. Make your own opening.'
  },
  {
    id: 'fork', name: 'Split Current', branch: 'vector', cost: 1,
    requires: ['pin'], x: 66, y: 10,
    description: 'A charged hit jumps to a second nearby target. Use the closest enemy to reach the one behind it.'
  },
  {
    id: 'returnfire', name: 'Return Address', branch: 'resonance', cost: 1,
    requires: [], x: 50, y: 60,
    description: 'Parried projectiles home back to an enemy and strike with twice their original force.'
  },
  {
    id: 'pulsecatch', name: 'Homecoming', branch: 'resonance', cost: 1,
    requires: ['returnfire'], x: 42, y: 73,
    description: 'A perfect catch releases a short pulse that staggers nearby enemies. Catch under pressure to take back space.'
  },
  {
    id: 'stormchain', name: 'Borrowed Storm', branch: 'resonance', cost: 1,
    requires: ['pulsecatch'], x: 57, y: 84,
    description: 'A successful parry primes your next throw to arc through another nearby enemy.'
  },
  {
    id: 'bloodtide', name: 'Second Wind', branch: 'resonance', cost: 1,
    requires: ['stormchain'], x: 43, y: 93,
    description: 'Kill nearby enemies with the returning lance to recover extra health. Stay close and bring it home.'
  }
];
