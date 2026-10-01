// Authored campaign content. parTime is a first-play design target, never a timer gate
// or a claim about measured campaign length. Cosmetic variation belongs to World.
export const DISTRICTS = [
  {
    id: 'quay', name: 'Freight Quay', subtitle: 'Where the city meets the water',
    accent: 0xf0aa58, sky: 0x1b2c3a, fog: 0x344552, fogDensity: 0.005,
    sun: 0xffe0b0, ambient: 0x859dae, mood: 'storm',
    floorMaterial: 'concrete', wallMaterial: 'rust'
  },
  {
    id: 'transit', name: 'Flooded Transit', subtitle: 'The last train went uphill',
    accent: 0xe9ba70, sky: 0x182a32, fog: 0x334852, fogDensity: 0.007,
    sun: 0xf6e5c7, ambient: 0x82999c, mood: 'submerged',
    floorMaterial: 'marble', wallMaterial: 'brick'
  },
  {
    id: 'garden', name: 'Glass Conservatory', subtitle: 'Something kept growing',
    accent: 0xe8c775, sky: 0x8fbbcb, fog: 0xa0beb0, fogDensity: 0.003,
    sun: 0xffecc8, ambient: 0xaac2ab, mood: 'sunlit',
    floorMaterial: 'stone', wallMaterial: 'glass'
  },
  {
    id: 'foundry', name: 'Foundry', subtitle: 'The heat under every home',
    accent: 0xff9253, sky: 0x2c2020, fog: 0x5a3529, fogDensity: 0.006,
    sun: 0xffb579, ambient: 0x93695a, mood: 'furnace',
    floorMaterial: 'dark', wallMaterial: 'rust'
  },
  {
    id: 'spillway', name: 'Winter Spillway', subtitle: 'Above the storm line',
    accent: 0xf2c276, sky: 0x9fc6df, fog: 0xb5cfdb, fogDensity: 0.0035,
    sun: 0xfff0d7, ambient: 0x8facbb, mood: 'snow',
    floorMaterial: 'snow', wallMaterial: 'concrete'
  },
  {
    id: 'crown', name: 'Storm Crown', subtitle: 'No one was meant to come this far',
    accent: 0xf0b56e, sky: 0x253445, fog: 0x5b6675, fogDensity: 0.003,
    sun: 0xffd1a1, ambient: 0x8897ad, mood: 'electric',
    floorMaterial: 'steel', wallMaterial: 'dark'
  }
];

const wave = (...entries) => entries.map(([type, count]) => ({ type, count }));
const arena = (name, shape, offsetX, width, length, waves, extra = {}) => ({
  name, shape, offsetX, width, length, waves, ...extra
});

// These are small places, not collectible serial numbers. The optional record is
// heard only after entering the refuge; the main route never depends on finding it.
const SECRET_PLACES = {
  'wake-dock': ['Night Watch Room', 'An amber maintenance lamp marks a refuge off the loading route.'],
  'container-canyon': ['The Lunch Shelter', 'Look along the sheltered edge of the cargo stacks.'],
  'drydock-spine': ['Small Boat Office', 'The service ledge beside the drydock leads away from the main lights.'],
  counterweight: ['The Crane Hand\'s Rest', 'A quiet maintenance refuge sits beside the crane works.'],
  'grand-concourse': ['Left Luggage', 'Look beyond the public concourse into the little service rooms.'],
  'last-platform': ['The Window Seat', 'The platform edge hides a place where somebody waited.'],
  'signal-descent': ['The Night Signal Desk', 'A side light marks the old signal staff\'s shelter.'],
  'the-switchman': ['Lost Property Office', 'An overlooked staff passage leads away from the junction.'],
  'sun-court': ['The Unlisted Herb Bed', 'There is a sheltered planting space beyond the formal court.'],
  'hanging-orchard': ['The Crooked Branch', 'Follow a quiet service edge beneath the orchard terraces.'],
  'rain-gallery': ['The Rain Reader\'s Niche', 'A dry maintenance nook overlooks the water works.'],
  'the-glasskeeper': ['The Pear Nursery', 'The garden has one small place the machines never needed.'],
  'casting-floor': ['The Unfinished Playground', 'Look for a worker\'s refuge beside the casting route.'],
  'furnace-choir': ['The Second Chair', 'The furnace crew left a little warmth off the main floor.'],
  chainworks: ['The Apprentice\'s Corner', 'A maintenance edge leads away from the moving machinery.'],
  crucible: ['The Shelter Line', 'A quiet service alcove has a signal from the city below.'],
  'white-cut': ['The Knitted Gauge', 'Find shelter beside the exposed dam route.'],
  'turbine-cathedral': ['The Sea Listener', 'A side maintenance ledge opens away from the turbine route.'],
  'ice-ladder': ['The Warm Room', 'One little service refuge still holds the day\'s heat.'],
  floodgate: ['A Place Without Warning Lights', 'The dam workers kept a refuge off the pressure route.'],
  'copper-horizon': ['The Window Request', 'Look for a small service space at the edge of the Crown.'],
  'induction-gardens': ['The Paper Boat', 'The induction works have an overlooked quiet edge.'],
  'broken-halo': ['The Builders\' View', 'A maintenance refuge looks back toward the unfinished city.'],
  'the-warden': ['The Original Promise', 'A side archive keeps a record of what the wall was built for.'],
  'first-light': ['On Your Way Back', 'There is one last quiet place beside the way home.']
};

export const SECTORS = [
  {
    id: 'wake-dock', district: 0, name: 'Wake Dock',
    subtitle: 'Find the return line', layout: 'harbor-dogleg', parTime: 240,
    objective: 'Clear the dock relay and reach the amber service door.',
    briefing: 'MARA: The sea wall has cut the lower city off. That lance still carries a service key. Throw it past a machine, move, and call it back through them.',
    completion: 'Dock relay connected. One shelter has its lights back.',
    secret: { text: 'Dock record: the night crew painted a sunrise on the tide gauge. It is still above the water.', reward: 150 },
    arenas: [
      arena('The first mooring', 'dock', 0, 26, 34, [
        wave(['skitter', 3])
      ]),
      arena('Flooded loading apron', 'basin', 7, 32, 38, [
        wave(['skitter', 2], ['rifle', 1]),
        wave(['skitter', 3])
      ]),
      arena('Relay yard', 'dock', -4, 30, 40, [
        wave(['rifle', 2], ['skitter', 2]),
        wave(['skitter', 3], ['rifle', 1])
      ])
    ]
  },
  {
    id: 'container-canyon', district: 0, name: 'Container Canyon',
    subtitle: 'A second way through', layout: 'stacked-switchback', parTime: 300,
    objective: 'Break the container-yard defense and reconnect the freight line.',
    briefing: 'MARA: Those shields were built for falling cargo. Put the lance behind them. The service lights mark the way through the stacks.',
    completion: 'Freight power restored. The shelter shutters are opening.',
    secret: { text: 'A note inside a lunch tin: Keep the red scarf. I will find you by it.', reward: 175 },
    arenas: [
      arena('Narrow stack', 'canyon', -8, 24, 42, [
        wave(['shield', 1], ['skitter', 3]),
        wave(['rifle', 2], ['skitter', 2])
      ]),
      arena('High loading bridge', 'gantry', 8, 34, 36, [
        wave(['shield', 2], ['rifle', 2]),
        wave(['skitter', 4])
      ]),
      arena('Open freight throat', 'canyon', 1, 28, 40, [
        wave(['rifle', 3], ['skitter', 2]),
        wave(['shield', 2], ['skitter', 3])
      ])
    ]
  },
  {
    id: 'drydock-spine', district: 0, name: 'Drydock Spine',
    subtitle: 'Under an unfinished ship', layout: 'ribbed-diagonal', parTime: 300,
    objective: 'Cross the drydock and release the crane safety interlocks.',
    briefing: 'MARA: The crane controls the station entrance. Cross the basin first. A rifle lamp brightens just before it fires; move across the shot, not away from it.',
    completion: 'The crane interlocks are released. Its operator has noticed.',
    secret: { text: 'Work order: lift the smallest boats first. Families are waiting for those.', reward: 200 },
    arenas: [
      arena('Keel channel', 'basin', 4, 38, 42, [
        wave(['rifle', 3], ['skitter', 3]),
        wave(['shield', 1], ['rifle', 2])
      ]),
      arena('Ribbed hull', 'gantry', -10, 28, 38, [
        wave(['shield', 2], ['skitter', 3]),
        wave(['rifle', 4])
      ]),
      arena('Winch terrace', 'terrace', 5, 36, 34, [
        wave(['skitter', 4], ['rifle', 2]),
        wave(['shield', 2], ['rifle', 2], ['skitter', 2])
      ], { rule: 'crossfire' })
    ]
  },
  {
    id: 'counterweight', district: 0, name: 'Counterweight',
    subtitle: 'A machine built to lift the world', layout: 'crane-threshold', parTime: 300,
    objective: 'Defeat Counterweight and open the route into transit.',
    briefing: 'MARA: My father worked this crane. The arm still follows its warning light. Give the slam room, then bring the lance back while the counterweight is exposed.',
    completion: 'Counterweight is down. A way into the station has opened.',
    secret: { text: 'MARA: He used to wave from the cab. You could only see his glove from down here.', reward: 250 },
    arenas: [
      arena('Ballast stores', 'canyon', -5, 30, 34, [
        wave(['shield', 2], ['skitter', 2]),
        wave(['rifle', 3], ['skitter', 2])
      ]),
      arena('Crane approach', 'dock', 6, 34, 38, [
        wave(['rifle', 3], ['shield', 1]),
        wave(['skitter', 5])
      ]),
      arena('Counterweight platform', 'basin', 0, 40, 42, [], { boss: 'counterweight' })
    ]
  },
  {
    id: 'grand-concourse', district: 1, name: 'Grand Concourse',
    subtitle: 'The city went through here', layout: 'vaulted-islands', parTime: 240,
    objective: 'Restore the concourse relay and follow the lit platform signs.',
    briefing: 'MARA: The last evacuation train made it uphill. We need the pumps that kept this station dry. Watch for the mortar rings on the floor.',
    completion: 'The concourse pumps are turning. The water is moving again.',
    secret: { text: 'Station announcement, saved locally: Leave your bags. There is room for everybody.', reward: 175 },
    arenas: [
      arena('Ticket islands', 'concourse', 0, 40, 36, [
        wave(['rifle', 3], ['shield', 1]),
        wave(['mortar', 1], ['skitter', 3])
      ]),
      arena('Departure arcade', 'court', -12, 32, 40, [
        wave(['mortar', 2], ['rifle', 2]),
        wave(['shield', 2], ['skitter', 3])
      ]),
      arena('Pump gallery', 'platform', 3, 28, 42, [
        wave(['rifle', 3], ['mortar', 1]),
        wave(['shield', 2], ['rifle', 2], ['skitter', 2])
      ], { rule: 'crossfire' })
    ]
  },
  {
    id: 'last-platform', district: 1, name: 'Last Platform',
    subtitle: 'Follow the high line', layout: 'parallel-platforms', parTime: 300,
    objective: 'Break through the platform defenses and reach the uphill junction.',
    briefing: 'MARA: The high service route runs beside the tracks. Keep moving between the cover. If two firing lanes cross, use the gap after the volley.',
    completion: 'The uphill junction is connected. You can hear the mountain line.',
    secret: { text: 'A child drew seven carriages on a fogged window. Every one is full of tiny smiling faces.', reward: 200 },
    arenas: [
      arena('Southbound island', 'platform', -10, 26, 42, [
        wave(['shield', 2], ['rifle', 3]),
        wave(['mortar', 1], ['skitter', 4])
      ]),
      arena('Trackside overpass', 'bridge', 5, 30, 34, [
        wave(['rifle', 4], ['mortar', 1]),
        wave(['shield', 2], ['rifle', 2])
      ], { rule: 'crossfire' }),
      arena('Upper platform', 'platform', 12, 36, 40, [
        wave(['mortar', 2], ['shield', 1], ['skitter', 2]),
        wave(['rifle', 3], ['skitter', 4])
      ])
    ]
  },
  {
    id: 'signal-descent', district: 1, name: 'Signal Descent',
    subtitle: 'The way down is lit', layout: 'signal-spiral', parTime: 300,
    objective: 'Clear the signal relays and reach the central switch machine.',
    briefing: 'MARA: The signal room has its own emergency circuit. Follow amber. A red warning line locks onto the place the next shot will cross.',
    completion: 'All three signal relays are live. The central switch is refusing the route.',
    secret: { text: 'Signal log: someone kept sending ALL CLEAR for six minutes after the office flooded.', reward: 200 },
    arenas: [
      arena('Signal balcony', 'spiral', 10, 34, 40, [
        wave(['rifle', 3], ['mortar', 2]),
        wave(['shield', 2], ['skitter', 3])
      ], { rule: 'blackout' }),
      arena('Cable well', 'turbine', -6, 38, 38, [
        wave(['mortar', 2], ['shield', 2]),
        wave(['rifle', 4], ['skitter', 2])
      ]),
      arena('Interlocking gallery', 'concourse', 8, 40, 34, [
        wave(['rifle', 3], ['shield', 2]),
        wave(['mortar', 2], ['skitter', 4]),
        wave(['rifle', 2], ['shield', 1])
      ], { rule: 'blackout' })
    ]
  },
  {
    id: 'the-switchman', district: 1, name: 'The Switchman',
    subtitle: 'The route that was refused', layout: 'three-track-junction', parTime: 300,
    objective: 'Defeat the Switchman and divert power toward the conservatory.',
    briefing: 'MARA: It is protecting an empty train. A red lane locks before it charges. Dash across that lane, then hit the bright core while the engine brakes.',
    completion: 'The mountain line is open. Warm air is coming down from the gardens.',
    secret: { text: 'A brass key, tagged LOST PROPERTY. The station kept it for a house the sea took years ago.', reward: 250 },
    arenas: [
      arena('Points cabin', 'platform', 8, 28, 36, [
        wave(['mortar', 2], ['rifle', 2]),
        wave(['shield', 2], ['skitter', 3])
      ]),
      arena('Marshalling throat', 'concourse', -6, 38, 40, [
        wave(['rifle', 4], ['shield', 1]),
        wave(['mortar', 2], ['skitter', 3])
      ], { rule: 'crossfire' }),
      arena('The three-way junction', 'platform', 0, 40, 42, [], { boss: 'switchman' })
    ]
  },
  {
    id: 'sun-court', district: 2, name: 'Sun Court',
    subtitle: 'The storm ends at the glass', layout: 'limestone-courtyard', parTime: 240,
    objective: 'Reconnect the irrigation court and reach the canopy service lift.',
    briefing: 'MARA: There you are. Actual daylight. The hunters follow your approach, then commit. Draw them out and move across their lunge.',
    completion: 'The court is watering again. A small, ordinary thing worth saving.',
    secret: { text: 'Seed inventory: tomatoes, pears, basil, marigolds. Someone added Mum\'s beans in pencil.', reward: 175 },
    arenas: [
      arena('Morning court', 'court', 0, 38, 36, [
        wave(['hunter', 2], ['skitter', 2]),
        wave(['hunter', 3])
      ]),
      arena('Limestone terraces', 'terrace', -10, 34, 40, [
        wave(['hunter', 3], ['mortar', 1]),
        wave(['rifle', 2], ['hunter', 2], ['skitter', 2])
      ]),
      arena('Canopy court', 'court', 6, 40, 38, [
        wave(['mortar', 2], ['hunter', 3]),
        wave(['hunter', 4], ['shield', 1])
      ])
    ]
  },
  {
    id: 'hanging-orchard', district: 2, name: 'Hanging Orchard',
    subtitle: 'Fruit above the flood', layout: 'terraced-canopy', parTime: 300,
    objective: 'Cross the orchard terraces and restore the upper water circuit.',
    briefing: 'MARA: These terraces feed the shelters. Take the high edge when the ground gets crowded. You have enough room for a dash between the planters.',
    completion: 'The upper water circuit is restored. The trees will make it through tonight.',
    secret: { text: 'A pruning notebook: Leave the crooked branch. The children use it as a seat.', reward: 200 },
    arenas: [
      arena('Rootwalk', 'terrace', -12, 28, 42, [
        wave(['hunter', 3], ['mortar', 2]),
        wave(['skitter', 4], ['hunter', 2])
      ]),
      arena('Orchard span', 'bridge', 4, 30, 34, [
        wave(['hunter', 4], ['rifle', 2]),
        wave(['mortar', 2], ['shield', 1], ['hunter', 2])
      ]),
      arena('Crown terrace', 'terrace', 12, 36, 40, [
        wave(['hunter', 3], ['mortar', 2]),
        wave(['hunter', 4], ['skitter', 3])
      ], { rule: 'risingwater' })
    ]
  },
  {
    id: 'rain-gallery', district: 2, name: 'Rain Gallery',
    subtitle: 'A river above your head', layout: 'curved-aqueduct', parTime: 300,
    objective: 'Clear the rain collectors and reach the glasshouse heart.',
    briefing: 'MARA: The collectors are releasing pressure through the floor. Jump the low rings. Do not let the hunters choose your landing.',
    completion: 'The collectors have emptied safely. The glasshouse heart is awake.',
    secret: { text: 'Rainfall chart: a hundred careful measurements. The last entry just says Enough.', reward: 225 },
    arenas: [
      arena('Glass channel', 'aqueduct', 10, 26, 42, [
        wave(['mortar', 2], ['hunter', 3]),
        wave(['rifle', 3], ['hunter', 2])
      ], { rule: 'risingwater' }),
      arena('Collector court', 'court', -7, 40, 36, [
        wave(['hunter', 4], ['shield', 1]),
        wave(['mortar', 3], ['skitter', 3])
      ]),
      arena('Overflow ribbon', 'aqueduct', 9, 30, 40, [
        wave(['hunter', 3], ['mortar', 2]),
        wave(['hunter', 4], ['rifle', 2]),
        wave(['skitter', 4])
      ], { rule: 'risingwater' })
    ]
  },
  {
    id: 'the-glasskeeper', district: 2, name: 'The Glasskeeper',
    subtitle: 'Nothing comes through the canopy', layout: 'canopy-heart', parTime: 360,
    objective: 'Defeat the Glasskeeper and open the descent to the foundry.',
    briefing: 'MARA: It has kept these roots warm for thirty years. Something changed its orders. Read the gaps in its glass fans; parry a lens round to force its shutters open.',
    completion: 'The glasshouse is safe. Its heat circuit leads down into the foundry.',
    secret: { text: 'MARA: I planted a pear seed here when I was nine. I hope it was one of these.', reward: 275 },
    arenas: [
      arena('Pruning terraces', 'terrace', -6, 34, 38, [
        wave(['hunter', 3], ['mortar', 2]),
        wave(['hunter', 4], ['shield', 1])
      ]),
      arena('Root chamber', 'court', 8, 38, 34, [
        wave(['mortar', 2], ['rifle', 2], ['hunter', 2]),
        wave(['hunter', 5])
      ]),
      arena('The living canopy', 'ring', 0, 40, 42, [], { boss: 'glasskeeper' })
    ]
  },
  {
    id: 'casting-floor', district: 3, name: 'Casting Floor',
    subtitle: 'The city is still being made', layout: 'hot-channel-crossing', parTime: 240,
    objective: 'Open the foundry service route and restore the casting relay.',
    briefing: 'MARA: A furnace cannot turn quickly while it vents. Cross its heat cone, then hit the bright cooling core. Keep a clear path out of the floor markings.',
    completion: 'The casting relay is live. Heat is reaching the lower city again.',
    secret: { text: 'Casting stamp: a replacement playground slide. The order was never cancelled.', reward: 200 },
    arenas: [
      arena('Receiving hearth', 'casting', 0, 36, 38, [
        wave(['furnace', 1], ['skitter', 3]),
        wave(['furnace', 2], ['rifle', 2])
      ]),
      arena('Mold aisle', 'canyon', -10, 28, 42, [
        wave(['furnace', 2], ['shield', 1], ['skitter', 2]),
        wave(['rifle', 3], ['hunter', 2])
      ]),
      arena('Open casting pit', 'casting', 6, 40, 34, [
        wave(['furnace', 2], ['mortar', 1], ['skitter', 3]),
        wave(['furnace', 2], ['hunter', 3])
      ], { rule: 'overpressure' })
    ]
  },
  {
    id: 'furnace-choir', district: 3, name: 'Furnace Choir',
    subtitle: 'Listen before it breathes', layout: 'staggered-crucibles', parTime: 300,
    objective: 'Release the furnace pressure and reach the chainworks control.',
    briefing: 'MARA: The marked circles show where the floor will vent. Keep a clear patch beside you and use the pressure break to get close.',
    completion: 'The furnace pressure is falling. The chainworks route is clear.',
    secret: { text: 'Shift schedule: every name has a second name beside it. Nobody worked the night furnace alone.', reward: 225 },
    arenas: [
      arena('Bellows hall', 'crucible', -11, 38, 38, [
        wave(['furnace', 2], ['mortar', 2]),
        wave(['hunter', 3], ['skitter', 3])
      ], { rule: 'overpressure' }),
      arena('Heat exchange', 'casting', 6, 34, 42, [
        wave(['furnace', 3], ['rifle', 2]),
        wave(['shield', 2], ['hunter', 3])
      ]),
      arena('The breathing floor', 'crucible', -3, 40, 36, [
        wave(['mortar', 2], ['furnace', 2], ['skitter', 2]),
        wave(['furnace', 3], ['hunter', 2]),
        wave(['rifle', 3])
      ], { rule: 'overpressure' })
    ]
  },
  {
    id: 'chainworks', district: 3, name: 'Chainworks',
    subtitle: 'Everything here holds something up', layout: 'overhead-conveyors', parTime: 300,
    objective: 'Clear the chainworks relays and release the main furnace access.',
    briefing: 'MARA: The service gantries cut across the machinery. Take a different height when the floor closes in. We need the big furnace offline, not the little ones.',
    completion: 'The main furnace is isolated. The homes can keep their heat.',
    secret: { text: 'An apprentice engraved a tiny fish inside a chain link. It has gone around this room for years.', reward: 225 },
    arenas: [
      arena('Hanging stock', 'gantry', 10, 28, 40, [
        wave(['shield', 2], ['furnace', 2], ['rifle', 1]),
        wave(['hunter', 4], ['skitter', 2])
      ]),
      arena('Conveyor crossing', 'bridge', -7, 30, 36, [
        wave(['furnace', 2], ['mortar', 2]),
        wave(['rifle', 4], ['shield', 1])
      ], { rule: 'crossfire' }),
      arena('Suspension yard', 'gantry', 8, 38, 42, [
        wave(['furnace', 3], ['hunter', 2]),
        wave(['shield', 2], ['mortar', 2], ['skitter', 2]),
        wave(['furnace', 1], ['rifle', 3])
      ], { rule: 'overpressure' })
    ]
  },
  {
    id: 'crucible', district: 3, name: 'Crucible',
    subtitle: 'A hundred years of stored heat', layout: 'casting-heart', parTime: 360,
    objective: 'Defeat Crucible and redirect the heat into the mountain spillway.',
    briefing: 'MARA: When the heat cone begins to glow, a charged core hit can rupture the vent. Miss that opening, cross the cone and strike while it cools. Keep clear of the slag circles.',
    completion: 'Crucible is quiet. The frozen spillway has enough heat to turn.',
    secret: { text: 'MARA: The shelter just called. The radiators are warm. They wanted you to know.', reward: 275 },
    arenas: [
      arena('Cooling apron', 'casting', -8, 34, 36, [
        wave(['furnace', 2], ['hunter', 3]),
        wave(['mortar', 2], ['shield', 2])
      ]),
      arena('Foundry throat', 'canyon', 7, 30, 40, [
        wave(['furnace', 3], ['rifle', 2]),
        wave(['hunter', 3], ['skitter', 3])
      ], { rule: 'overpressure' }),
      arena('Crucible chamber', 'crucible', 0, 40, 42, [], { boss: 'crucible' })
    ]
  },
  {
    id: 'white-cut', district: 4, name: 'White Cut',
    subtitle: 'Above the clouds', layout: 'dam-crest', parTime: 240,
    objective: 'Reconnect the dam-crest relays and enter the turbine works.',
    briefing: 'MARA: You are above the storm. The inspection masts lock a red sightline before they fire. Keep a dash ready and move when the line steadies.',
    completion: 'The crest relays are connected. The turbines can hear us.',
    secret: { text: 'A wind gauge is wrapped in a knitted sleeve. Someone could not bear to leave anything cold.', reward: 200 },
    arenas: [
      arena('Snowline apron', 'ridge', 0, 34, 38, [
        wave(['sniper', 2], ['skitter', 3]),
        wave(['sniper', 2], ['hunter', 2])
      ]),
      arena('White service cut', 'switchback', -12, 26, 42, [
        wave(['sniper', 2], ['tether', 1], ['rifle', 2]),
        wave(['hunter', 3], ['shield', 1])
      ]),
      arena('Dam crown', 'ridge', 5, 38, 36, [
        wave(['tether', 2], ['sniper', 2]),
        wave(['sniper', 3], ['skitter', 3])
      ], { rule: 'crosswind' })
    ]
  },
  {
    id: 'turbine-cathedral', district: 4, name: 'Turbine Cathedral',
    subtitle: 'A mountain turning inside itself', layout: 'radial-scaffolds', parTime: 300,
    objective: 'Clear the turbine galleries and release the frozen pressure circuit.',
    briefing: 'MARA: The cable winches sweep low across the galleries. Jump the cable as it reaches you, or stagger the winch before it can finish the sweep.',
    completion: 'The turbines are turning. The pressure circuit is thawing.',
    secret: { text: 'On the service rail: initials, a date, and an arrow pointing toward the sound of the sea.', reward: 225 },
    arenas: [
      arena('Upper turbine ring', 'turbine', 10, 40, 40, [
        wave(['tether', 2], ['hunter', 3]),
        wave(['sniper', 2], ['rifle', 3])
      ], { rule: 'crosswind' }),
      arena('Governor bridge', 'bridge', -6, 28, 34, [
        wave(['tether', 2], ['sniper', 2], ['skitter', 2]),
        wave(['shield', 2], ['hunter', 3])
      ]),
      arena('Lower turbine ring', 'turbine', 9, 38, 42, [
        wave(['tether', 3], ['sniper', 2]),
        wave(['hunter', 4], ['mortar', 1]),
        wave(['sniper', 2], ['skitter', 2])
      ], { rule: 'risingwater' })
    ]
  },
  {
    id: 'ice-ladder', district: 4, name: 'Ice Ladder',
    subtitle: 'Keep the next light in sight', layout: 'vertical-switchbacks', parTime: 300,
    objective: 'Climb the spillway service route and reach the floodgate controls.',
    briefing: 'MARA: I am in the control room below that last gate. Take the scaffolds one at a time. The whole coast is on the other side of this wall.',
    completion: 'The service route is connected. Mara is directly below you.',
    secret: { text: 'A pair of boots stands by a heater. The owner left a note: Back after the gate test.', reward: 250 },
    arenas: [
      arena('Ice footing', 'switchback', -12, 26, 40, [
        wave(['sniper', 3], ['tether', 1]),
        wave(['hunter', 3], ['skitter', 3])
      ]),
      arena('Dam-face scaffold', 'gantry', 4, 30, 42, [
        wave(['tether', 2], ['sniper', 2], ['rifle', 2]),
        wave(['shield', 2], ['hunter', 2])
      ], { rule: 'crosswind' }),
      arena('Last ice terrace', 'ridge', 12, 36, 36, [
        wave(['sniper', 3], ['mortar', 2]),
        wave(['tether', 2], ['hunter', 3]),
        wave(['rifle', 3], ['skitter', 2])
      ], { rule: 'crosswind' })
    ]
  },
  {
    id: 'floodgate', district: 4, name: 'Floodgate',
    subtitle: 'Hold back the whole sea', layout: 'hydraulic-threshold', parTime: 360,
    objective: 'Defeat Floodgate and send the restored current to the Storm Crown.',
    briefing: 'MARA: Jump a low pressure wave to unbalance the turbine and open its core. Sidestep the high jets. I will hold the manual gate from here.',
    completion: 'The floodgate is open. Mara has the manual wheel. The restored current is climbing to the Crown.',
    secret: { text: 'MARA: When this is over, I am going to sit somewhere without a warning light.', reward: 300 },
    arenas: [
      arena('Pressure forecourt', 'ridge', -8, 36, 38, [
        wave(['tether', 2], ['sniper', 2]),
        wave(['hunter', 3], ['shield', 2])
      ]),
      arena('Control spill', 'aqueduct', 7, 30, 40, [
        wave(['sniper', 2], ['mortar', 2], ['skitter', 2]),
        wave(['tether', 2], ['hunter', 3])
      ], { rule: 'risingwater' }),
      arena('The hydraulic gate', 'basin', 0, 40, 42, [], { boss: 'floodgate' })
    ]
  },
  {
    id: 'copper-horizon', district: 5, name: 'Copper Horizon',
    subtitle: 'The storm has a roof', layout: 'suspended-pylons', parTime: 240,
    objective: 'Reconnect the Crown pylons and find the breakwater control line.',
    briefing: 'MARA: The Crown has been taking power from every district below it. Prism rigs split their shots into fans. Read the gaps; a reflected shot breaks their rhythm.',
    completion: 'The outer pylons are connected. The current is finally running both ways.',
    secret: { text: 'Crown maintenance record: a technician requested windows. The request was marked unnecessary.', reward: 225 },
    arenas: [
      arena('Cloud bridge', 'bridge', 0, 26, 42, [
        wave(['prism', 2], ['rifle', 2]),
        wave(['prism', 2], ['hunter', 3])
      ]),
      arena('Copper landing', 'coil', -10, 38, 38, [
        wave(['prism', 2], ['tether', 2]),
        wave(['sniper', 2], ['shield', 2], ['skitter', 2])
      ]),
      arena('Outer Crown relay', 'bridge', 6, 32, 40, [
        wave(['prism', 3], ['rifle', 2]),
        wave(['tether', 2], ['hunter', 3])
      ], { rule: 'crossfire' })
    ]
  },
  {
    id: 'induction-gardens', district: 5, name: 'Induction Gardens',
    subtitle: 'Lightning kept on a leash', layout: 'orbiting-coils', parTime: 300,
    objective: 'Clear the induction terraces and release the inner-ring current.',
    briefing: 'MARA: The coils have pulled everything toward the center. Work around the outside and bring the lance across the middle. Make their crossfire yours.',
    completion: 'The inner-ring current is released. The Crown is losing its hold on the city.',
    secret: { text: 'An engineer left a little paper boat beside the largest coil. There has never been water up here.', reward: 250 },
    arenas: [
      arena('First induction ring', 'coil', -10, 40, 40, [
        wave(['prism', 2], ['tether', 2], ['skitter', 2]),
        wave(['sniper', 3], ['hunter', 2])
      ], { rule: 'crossfire' }),
      arena('Magnet terrace', 'terrace', 6, 34, 36, [
        wave(['prism', 3], ['shield', 2]),
        wave(['furnace', 2], ['hunter', 3])
      ]),
      arena('Second induction ring', 'coil', -4, 38, 42, [
        wave(['prism', 3], ['tether', 2]),
        wave(['mortar', 2], ['rifle', 3], ['skitter', 2]),
        wave(['prism', 2], ['hunter', 2])
      ], { rule: 'blackout' })
    ]
  },
  {
    id: 'broken-halo', district: 5, name: 'Broken Halo',
    subtitle: 'The last circle has a way out', layout: 'inner-outer-ring', parTime: 300,
    objective: 'Cross the broken ring and reach the Warden of the Crown.',
    briefing: 'MARA: Follow the amber service path around the ring. I can keep the sea gate open from here. You only have to keep going.',
    completion: 'You have crossed the halo. Only the Warden stands between you and the heart.',
    secret: { text: 'A service photograph shows the unfinished ring. Beyond it, the whole city is covered in scaffolds and people.', reward: 275 },
    arenas: [
      arena('Outer arc', 'ring', 10, 38, 42, [
        wave(['prism', 3], ['sniper', 2]),
        wave(['tether', 2], ['hunter', 3], ['skitter', 2])
      ], { rule: 'crosswind' }),
      arena('Broken span', 'bridge', -7, 28, 36, [
        wave(['prism', 2], ['furnace', 2], ['rifle', 2]),
        wave(['shield', 2], ['hunter', 3])
      ], { rule: 'crossfire' }),
      arena('Inner arc', 'ring', 8, 40, 40, [
        wave(['prism', 3], ['tether', 2]),
        wave(['sniper', 2], ['mortar', 2], ['hunter', 2]),
        wave(['prism', 2], ['skitter', 3])
      ], { rule: 'blackout' })
    ]
  },
  {
    id: 'the-warden', district: 5, name: 'The Warden',
    subtitle: 'A shield pointed inward', layout: 'crown-defense', parTime: 360,
    objective: 'Defeat the Warden and reach the original breakwater heart.',
    briefing: 'MARA: The Warden was built to protect the heart from a surge. Reflect the precision round on its red sightline to disable fire control and expose the optic. You have done harder things to get here.',
    completion: 'The Warden has fallen. The breakwater heart is still drawing the city dry.',
    secret: { text: 'Original design note: The wall exists to protect the town. This sentence is underlined twice.', reward: 300 },
    arenas: [
      arena('Warden approach', 'coil', -6, 36, 38, [
        wave(['prism', 3], ['tether', 2]),
        wave(['furnace', 2], ['hunter', 3])
      ]),
      arena('Armor gallery', 'bridge', 9, 30, 40, [
        wave(['sniper', 2], ['shield', 2], ['prism', 2]),
        wave(['tether', 2], ['hunter', 3], ['skitter', 2])
      ], { rule: 'crossfire' }),
      arena('The Crown defense', 'ring', 0, 40, 42, [], { boss: 'warden' })
    ]
  },
  {
    id: 'first-light', district: 5, name: 'First Light',
    subtitle: 'Bring the city home', layout: 'dawn-breakwater', parTime: 660,
    objective: 'Break the heart\'s control and reach the outer sea wall.',
    briefing: 'MARA: Every district is connected. The heart only needs to let go. I am keeping the sea out from down here. You bring the current home.',
    completion: 'The Crown releases its hold. The sea wall stays standing. Below you, windows light one by one. MARA: I can see it from here. Morning.',
    secret: { text: 'MARA: Someone in the shelter asked your name. I told them you were on your way back.', reward: 400 },
    arenas: [
      arena('The returning current', 'bridge', -6, 32, 42, [
        wave(['prism', 2], ['tether', 2], ['hunter', 2]),
        wave(['furnace', 2], ['sniper', 2], ['skitter', 3])
      ], { rule: 'crosswind' }),
      arena('Last conductor', 'coil', 8, 38, 40, [
        wave(['prism', 3], ['shield', 2], ['rifle', 2]),
        wave(['mortar', 2], ['hunter', 3], ['tether', 1]),
        wave(['prism', 2], ['furnace', 2])
      ], { rule: 'crossfire' }),
      arena('The breakwater heart', 'heart', 0, 40, 42, [], { boss: 'heart' }),
      // A quiet, playable approach to the ending after the heart is defeated.
      // No final enemy wave undermines the resolution and no timer pads it out.
      arena('The outer sea wall', 'dock', 0, 32, 40, [])
    ]
  }
].map((sector, index) => ({
  ...sector,
  index,
  districtName: DISTRICTS[sector.district].name,
  secret: {
    ...sector.secret,
    name: SECRET_PLACES[sector.id][0],
    hint: SECRET_PLACES[sector.id][1]
  }
}));
