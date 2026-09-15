// Which of the Eleven leaves which part on the car.
//
// Alex: "each boss grants one permanent part immediately when defeated". The pairing is the
// whole reward: you do not shop for the car, you build it out of what you killed. Left is a
// boss id from world/boss-catalog.js; right is a part id from vehicle/garage.js.
//
// Nothing here imports the renderer, the catalogue or the garage: it is one flat table so
// progress.js can read it on the frame a boss dies without pulling in the world.

export const PART_BY_BOSS = Object.freeze({
  fieldmaw:   'hotwire',      // The Road Beneath. The road gives the car back its start.
  antler:     'rambar',       // The Antlered Engine. You take its bar off the front of it.
  rootmother: 'treebreaker',  // Orchard Mother. Her wood is what the splitter is for.
  furnace:    'nitro',        // Kiln Saint. Burn.
  blacktide:  'armour',       // Mother of Tides. Plate against the thing that came in.
  underkeep:  'ward',         // The Kept. Coils off what was kept underground.
  choir:      'rebuilt',      // Unfinished Choir. The one that finishes the car.
  lantern:    'stolenlight',  // Lantern Eater. It ate light; now nothing takes yours.
  moth:       'mothscreen',   // Moonmolt.
  mire:       'miretyres',    // Mire Bride. The bog gives you the bog.
  bellwether: 'funeralpeal',  // Bellwether. The bell under the bumper.
});

/** The reverse, for a receipt or a card that has a part and wants the boss behind it. */
export const BOSS_BY_PART = Object.freeze(
  Object.entries(PART_BY_BOSS).reduce((m, [boss, part]) => { m[part] = boss; return m; },
    Object.create(null)),
);

export default PART_BY_BOSS;
