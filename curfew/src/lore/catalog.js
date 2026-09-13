// WHAT WE WERE TOLD. Only Vera, resident accounts and found writing belong in this ledger.
// The designer account stays outside the player-facing catalog.
export const LORE_SECTIONS = Object.freeze([["county", "The County"], ["places", "The Twenty-Two Places"], ["outside", "What’s Out There"], ["officers", "Those Who Keep Account"], ["vigils", "The Eleven Vigils"], ["people", "People of the Holdfast"], ["addresses", "The Forty Addresses"], ["road", "The Road"], ["found", "Found on Site"], ["rules", "The Rules We Keep"]].map(([id,title])=>Object.freeze({id,title})));
export const LORE_ENTRIES = Object.freeze([
  {
    "id": "county",
    "title": "The County",
    "section": "county",
    "text": "Meridian County. Named for the sun at noon; the seal has it. Somebody at the county office thought that was a good idea in 1841.\n\nWhat I know for certain: the sun set on the last day of October and did not come up. It has been snowing lightly ever since. The moon still keeps its hours, which is more than the rest of the sky does. There are no birds. There is no wind — smoke goes straight up, the mill turns without any, and washing hangs dead on the line. The ground is warm if you dig. Nobody has come.\n\nI keep the days. The first year has three different hands in it because two of us died. After that we stopped numbering them. We count moons now. Fern says that's healthier. — V.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "watches",
    "title": "The four watches",
    "section": "county",
    "text": "Dusk. “Dusk is when you go out. Nothing has decided anything yet.”\n\nDeep Night. “You get more for what you find in deep night because you had to go get it.”\n\nThe Black Hour. The Holdfast rings once before it. People call it the hour we gave back. “You don’t go out in the Black Hour. If you’re out, you don’t stop.”\n\nFalse Dawn. The east greys. The ground steams. Everybody has watched it and hated it. “Don’t look at it. It looks back.”",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "moon",
    "title": "The moon",
    "section": "county",
    "text": "The moon still keeps its appointments. We light the lamps at moonrise and call it morning. Moonrise Arms is a sensible name now. The purple banners began as a blanket.\n\nIn the margin: perhaps the moon isn’t in the hour with us. Perhaps it is outside, going on without us, like everything else.",
    "source": "Vera’s ledger",
    "circled": true
  },
  {
    "id": "road-lamps",
    "title": "The road lamps",
    "section": "county",
    "text": "The poles have been on since the last sunset. Forty coins buys a bulb. Ada shot a utility man under one on the north road, and that lamp stayed lit. The vests still reflect. They still carry the pole.\n\nWhen one begins to flicker, look for who is working underneath it.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "species:hound",
    "title": "Hounds",
    "section": "outside",
    "text": "\"They come up out of the ground. Not out of the woods — out of the ground, there are holes everywhere if you look. They're fast and they're stupid and there's a lot of them. If you see two eyes low and orange, that's one. If you see six, that's a night.\"",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "species:pallbearer",
    "title": "Pallbearers",
    "section": "outside",
    "text": "\"Six to a box. You'll dig where you shouldn't and the ground will open behind you and there they are, in their good suits, and they will pick you up and carry you east. Politely. They're not angry. It's the last thing they ever did and they do it well.\"",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "species:poacher",
    "title": "Poachers",
    "section": "outside",
    "text": "\"Living men. That's the first thing to understand. Poachers are alive, and they'll kill you for the bulbs in your bag and the coins in your pocket, and they'll take the bulb out of a road lamp with the pole still on. That's why the roads are dark in patches. That's not the dark doing it. That's us.\"",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "species:hunter",
    "title": "Hunters",
    "section": "outside",
    "text": "\"A hunter has hounds. He calls them with a name — a dog's name, always the same dog's name — and they come, and while you're dealing with them he's on you from the trees. If you hear a man calling a dog in the woods, the dog is not the problem.\"",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "species:standing",
    "title": "The Standing",
    "section": "outside",
    "text": "\"They were the ones who stood up. Everybody on the ridge waited sitting down, and some of them couldn't stand it, and they stood, and they started walking east to meet it. And they stopped. They stand in fields now, facing east, and they don't move unless your light touches them. Then their heads turn. Then they walk. Don't let one reach you. They fold you.\"",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "species:candle",
    "title": "Candles",
    "section": "outside",
    "text": "\"Some of them held a candle for the vigil, and kept holding it, and the candle burned down into the hand and kept going. They burn. Small. Blue, mostly. You'll see one at a window and think someone's home.\"",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "species:drowned",
    "title": "The Drowned",
    "section": "outside",
    "text": "\"Heavy, wet, slow. Out of the fen and the lock. Ruth says the ones she's tried to help have white threads in their mouths, fine as hair, going down the throat. She stopped trying to pull them out. They're not threads.\"",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "species:kneeler",
    "title": "Kneelers",
    "section": "outside",
    "text": "\"Three of them, that I know of. The foreman at the mine. Father Brand in the Cathedral. Hettie Marr at her boy's grave. They knelt on the first morning to pray it up and they never stood, and something about kneeling that long in front of a promise made them the size of it. They're as big as the buildings. They don't move at all until you bring light to their place. Then they stand up to meet the morning. And it's you.\"",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "species:warden",
    "title": "Wardens",
    "section": "outside",
    "text": "\"Reflective vest, bucket-truck helmet, bulb pole. County utility. They put the lights out. That's the job now. Ada shot one on the north road and the lamp it was under stayed lit for the rest of the night. I'm writing that down as a fact and not a hope.\"",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "species:pale",
    "title": "The Pale",
    "section": "officers",
    "text": "\"Two lights, high up in the trees, too high for anything. It watches. It's never been closer than the edge of the lamp. Hold your torch on it and it goes. Follow it and you'll find a hole. I have never heard of anyone shooting one.\"",
    "source": "Vera’s ledger",
    "circled": true
  },
  {
    "id": "species:pacer",
    "title": "The Pacer",
    "section": "officers",
    "text": "\"It walks the road ahead of you and you can't catch it and you can't pass it and it doesn't turn around. Once a night it does. Then get off the road.\"",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "species:auditor",
    "title": "The Auditor",
    "section": "officers",
    "text": "\"It sits down. At your table, at your fire. It has a book. Nobody has seen it write. It leaves when you've put your light somewhere that counts. Bram says it has his father's hands. Bram says a lot of things.\"",
    "source": "Vera’s ledger",
    "circled": true
  },
  {
    "id": "vigil:blacktide",
    "title": "Mother of Tides — Brine Lock",
    "section": "vigils",
    "text": "\"The lock's freshwater. Was. Bram says the boats came back folded — folded, like paper, the wood creased — and if you put your ear to one you can hear water moving inside it. There are whalebones in the pool. We are two hundred miles from any sea.\"\n\n— Nine boats went out. Captain Fenn said if the dark had an edge you'd see it from the water. Nine boats came back. He didn't.",
    "source": "What the Holdfast remembers",
    "circled": false
  },
  {
    "id": "vigil:rootmother",
    "title": "The Orchard Mother — Widow's Orchard",
    "section": "vigils",
    "text": "\"Em tends the town garden and she went out to the orchard once, to see if there was anything worth taking. She says the trunks are shaped like two people holding each other. Not carved. Grown. She says the roots move when you stand still. There's a sign at the gate that says not to pick what looks back and I have never wanted to ask what that means.\"\n\n— Sixteen trees. Sixteen widows. Ruthanne Pell said you plant in November if you want an April.",
    "source": "What the Holdfast remembers",
    "circled": false
  },
  {
    "id": "vigil:bellwether",
    "title": "The Bellwether — Bellfounder's Cut",
    "section": "vigils",
    "text": "\"Hale rings ours by hand. He says the one past Jackfield rings without a rope, and it rings when nobody's near it, and if you go toward it, it rings faster. He says the founder cast it from everything brass in the county. He says the founder's in it.\"",
    "source": "What the Holdfast remembers",
    "circled": false
  },
  {
    "id": "vigil:choir",
    "title": "The Unfinished Choir — Choir Silos",
    "section": "vigils",
    "text": "\"Oren hears it from the inn on still nights, which is every night. Singing from the silos south of the reserve. He walked out there once with a lamp and there were no footprints in the snow going in, and he's been sober for four years and I believe him.\"\n\n— The Cathedral choir. Thirty-one voices. They said a silo has the best acoustics in the county and the note would go down through the concrete.",
    "source": "What the Holdfast remembers",
    "circled": false
  },
  {
    "id": "vigil:furnace",
    "title": "The Kiln Saint — Charcoal Works",
    "section": "vigils",
    "text": "\"Min says the charcoal works east of town were shut down two years before any of this, and now they burn again with nothing in them. She was there at the start. She won't say more than that. She says the men called Marguerite Ashby the Saint before she did it and after.\"",
    "source": "What the Holdfast remembers",
    "circled": false
  },
  {
    "id": "vigil:lantern",
    "title": "The Lantern Eater — Last Light Viaduct",
    "section": "vigils",
    "text": "\"Joss came in from the southeast on foot and says there's a light under the viaduct that follows you. Not a person with a light. A light. It gets brighter when you stop. He says there are nine little blue lamps along the bank on the way in and they're the only ones in the county that never go out and I've never seen him afraid of anything else.\"",
    "source": "What the Holdfast remembers",
    "circled": false
  },
  {
    "id": "vigil:mire",
    "title": "The Mire Bride — Wading Chapel",
    "section": "vigils",
    "text": "\"Ruth won't pull the threads out anymore. She says they go down further than a hand reaches. Every one of the drowned has them. White. Fine as a veil.\"\n\n— There is a sign on the causeway to the chapel in the fen, hand-lettered by the mother, who was practical: WEDDING DRESS · NEVER WORN · ASK INSIDE.",
    "source": "What the Holdfast remembers",
    "circled": false
  },
  {
    "id": "vigil:moth",
    "title": "The Moonmolt — Lunar Conservatory",
    "section": "vigils",
    "text": "\"Leda keeps the town lamps and she keeps the calendar of moons. She went north to the conservatory when we heard something was growing there. She says the snow breathes. She says it comes down in time with something. She came back and didn't speak for a day.\"\n\n— They turned to the moon. It was the only thing in the sky still doing what it said it would.",
    "source": "What the Holdfast remembers",
    "circled": false
  },
  {
    "id": "vigil:antler",
    "title": "The Antlered Engine — Stag Crossing",
    "section": "vigils",
    "text": "\"Ada runs the watch. She says stay on the roads with the car. She says a patrol went out east on the second night to the crossing near Morning, four men in the truck, and three walked back, and the truck's engine was gone. Not the truck. The engine. She says the hoofprints up there are the size of a table.\"\n\n— The eastbound freight left on the first night to bring back help. The crossing bells have rung for it ever since.",
    "source": "What the Holdfast remembers",
    "circled": false
  },
  {
    "id": "vigil:underkeep",
    "title": "The Kept — Beneath the Holdfast",
    "section": "vigils",
    "text": "\"Nell leaves a bowl at the foot of the east stair every night and in the morning it's empty. Seth says the stair was sealed after the third group went down. He says his brother's is the last name scratched on the wall. Edith in the upper infirmary says every one of the ones who came back up had the same old cut across the palm — the handrail. I keep the town's days. I have never written down what is at the bottom of that stair and I am not going to start.\"",
    "source": "What the Holdfast remembers",
    "circled": false
  },
  {
    "id": "vigil:fieldmaw",
    "title": "The Road Beneath — The Unplanted Field",
    "section": "vigils",
    "text": "\"Mae has the roof watch and she says there's movement under the west field. Under. She says the ground moves like something's swimming in it. The field has never been planted, not since. Nobody walks it. Nobody drives near it. Half the men who went into it are the reason for the other half of that sentence.\"\n\n— Old Jackfield's west forty. Six men and a backhoe. The sign they left at the mine says the same thing: IT'S WARM DOWN HERE.",
    "source": "What the Holdfast remembers",
    "circled": false
  },
  {
    "id": "after:blacktide",
    "title": "Nine boats",
    "section": "vigils",
    "text": "Bram says the lock is quiet. Someone brought back something warm, the color a lamp makes on water. Fenn’s boats are still folded on the slipway. Nine went out. I have written the number again because the other one is harder to write.",
    "source": "Added after the vigil fell",
    "circled": false
  },
  {
    "id": "after:rootmother",
    "title": "The trees let go",
    "section": "vigils",
    "text": "Em went as far as the gate. She says the trunks have loosened. Sixteen, she counted, and sixteen names in the mine book. Ruthanne Pell’s name was not in that book. I have put it beside them.",
    "source": "Added after the vigil fell",
    "circled": false
  },
  {
    "id": "after:bellwether",
    "title": "The founder",
    "section": "vigils",
    "text": "Hale asked whether there had been a face inside the bell. He did not ask whose. Anders Kohl took our rings, the candlesticks, the door handles. Hale brought a piece of brass to the archive and laid it down very gently.",
    "source": "Added after the vigil fell",
    "circled": false
  },
  {
    "id": "after:choir",
    "title": "The last verse",
    "section": "vigils",
    "text": "Oren opened his window. Nothing from the silos. Delia Quist wrote thirty-one names in the choir folder. There are thirty-one. I counted twice. I have left the space after the hymn blank.",
    "source": "Added after the vigil fell",
    "circled": false
  },
  {
    "id": "after:furnace",
    "title": "Number four",
    "section": "vigils",
    "text": "Min sat with me after supper. “She asked me to close it. Someone had to keep the heat in.” She said Marguerite’s name and then she asked if the soup was still warm. It was.",
    "source": "Added after the vigil fell",
    "circled": false
  },
  {
    "id": "after:lantern",
    "title": "Tully’s lamps",
    "section": "vigils",
    "text": "Joss came in by the viaduct road. Nothing followed. Nine lamps still mark the bank. Someone has brought a little of the hoard back. Tully Ames kept the hardware shop. People trusted him with what they had.",
    "source": "Added after the vigil fell",
    "circled": false
  },
  {
    "id": "after:mire",
    "title": "The wedding",
    "section": "vigils",
    "text": "Ruth has folded away the linen she used for the drowned. There was a name on the chapel booking: Annalise Perrault. Sunrise service. I have not crossed it out. The dress sign is still on the causeway.",
    "source": "Added after the vigil fell",
    "circled": false
  },
  {
    "id": "after:moth",
    "title": "A clear patch of sky",
    "section": "vigils",
    "text": "Leda came back from the north with clean shoulders. No dust. “They took the roof off,” she said. “We all thought that part made sense.” The Lindqvist names are in the growers’ book. I have kept the page.",
    "source": "Added after the vigil fell",
    "circled": false
  },
  {
    "id": "after:antler",
    "title": "The crossing is quiet",
    "section": "vigils",
    "text": "Ada heard the silence before anyone told her. She has the sheriff’s copy of the letter sent east with the freight. Help was what it asked for. The crossing gates had been waiting for an answer.",
    "source": "Added after the vigil fell",
    "circled": false
  },
  {
    "id": "after:underkeep",
    "title": "The bowl",
    "section": "vigils",
    "text": "The lamps went out. Hale took the rope. Leda already knew where every wick was. Nell left the bowl at the stair as usual. It came back full.\n\nSeth asked me to spell Amos correctly. I always have.",
    "source": "Added after the vigil fell",
    "circled": false
  },
  {
    "id": "after:fieldmaw",
    "title": "The west forty",
    "section": "vigils",
    "text": "Mae says the field has stopped moving. Six names, a backhoe, and the chains from the Jackfield barn. “It’s warm down here,” the sign says. I have copied the other hand below it too: “that’s not a good thing.”",
    "source": "Added after the vigil fell",
    "circled": false
  },
  {
    "id": "place:filling-station",
    "title": "The Filling Station",
    "section": "places",
    "text": "\"The Halloran station on the shore road. Assembly Point 3 on the county evacuation map, which is why the map board's still on the wall. Dot Halloran pinned it. Every rumor anyone told her, she put a pin in, and she kept the pumps lit for the buses. There were no buses. Dot's on the ridge now with the others. The pins are still in.\"",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "note:site:filling-station",
    "title": "The Filling Station · found on site",
    "section": "found",
    "text": "MERIDIAN COUNTY EMERGENCY EVACUATION · ASSEMBLY POINT 3 · REMAIN AT THIS LOCATION · TRANSPORT DEPARTS AT FIRST LIGHT\nfirst light tuesday\nfirst light this week\nfirst light\nlight\n\nEach line is in a different hand.",
    "source": "Copied from the place",
    "circled": false
  },
  {
    "id": "place:blackthorn-manor",
    "title": "Blackthorn Manor",
    "section": "places",
    "text": "\"The big house in the pines. The Blackthorns owned the mine and paid for the Cathedral and put the words on half the stones in the Garden. There was a masque on Halloween — costumes, the whole county's money in one ballroom. When the morning didn't come the guests stayed for breakfast. Lucian Blackthorn, the last of them, went round the house and stopped every clock at one fifty-nine. Then he went down to the cellar and threw the breaker himself. Nobody's seen him since and the guests are still at breakfast.\"",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "note:site:blackthorn-manor",
    "title": "Blackthorn Manor · found on site",
    "section": "found",
    "text": "WE SHALL RISE TO MEET IT — J.B. · You first, Grandfather.",
    "source": "Copied from the place",
    "circled": false
  },
  {
    "id": "place:avery-house",
    "title": "The Avery House",
    "section": "places",
    "text": "\"Family house on the north spur. Six of them. There's a table on the back terrace laid for six and the plates are still out. There's a seventh chair, on its own, out past the garden, turned to face the house. Whoever sat there could see all six of them through the window. That's all I know and I've decided that's all I want to.\"",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "note:site:avery-house",
    "title": "The Avery House · found on site",
    "section": "found",
    "text": "Dad is outside watching so nothing gets us. He said he can see us from there. I waved. I dont think he saw.",
    "source": "Copied from the place",
    "circled": false
  },
  {
    "id": "place:weeping-mine",
    "title": "The Weeping Mine",
    "section": "places",
    "text": "\"Blackthorn's mine, east of the fields. The walls weep — that's real, the rock runs wet the whole way down, warm water, and it freezes at the top and runs at the bottom. The last shift was below when it happened. Abel Dunne was foreman. He knelt at the cage and he's still there and he's grown. Don't power the winding house unless you mean it.\"",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "note:site:weeping-mine",
    "title": "The Weeping Mine · found on site",
    "section": "found",
    "text": "IT'S WARM DOWN HERE\nthat's not a good thing",
    "source": "Copied from the place",
    "circled": false
  },
  {
    "id": "place:holdfast",
    "title": "The Holdfast",
    "section": "places",
    "text": "\"Crane's folly. A quarryman's castle from 1911, a state park until it was the only thing in the county with walls. We came in the first winter. Forty households, the keep, the upper street, the roof garden. The gate costs six hundred from outside and nothing from in, which is the town's whole philosophy. We ring the bell for people coming home. We keep the ovens. We keep the moon's calendar and the days I count. We are the only lit place in the county and everyone here knows why and nobody will tell you. Ask Nell what she does with the bowl.\"",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "note:site:holdfast",
    "title": "The Holdfast · found on site",
    "section": "found",
    "text": "BELLS FOR THE RETURNING · BREAD FOR THE STAYING · SILENCE FOR THE STAIR",
    "source": "Copied from the place",
    "circled": false
  },
  {
    "id": "place:the-toll",
    "title": "The Toll on the Broken Road",
    "section": "places",
    "text": "\"The highway checkpoint on the east ridge. Deputy Brandt and what's left of the department. Their last order was to hold the road until relieved, and they were never relieved, so they hold it. Two hundred and twenty coins to pass. If you argue they'll kill you, and they'll be sorry about it. North of them the highway's jammed solid in one lane. The other lane's empty. Nobody was coming in.\"",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "note:site:the-toll",
    "title": "The Toll on the Broken Road · found on site",
    "section": "found",
    "text": "MERIDIAN CO. SHERIFF · EVACUATION CONTROL POINT 1 · HOLD UNTIL RELIEVED · vehicles processed: 2,211 · vehicles returned: 0 · relief ETA: ______",
    "source": "Copied from the place",
    "circled": false
  },
  {
    "id": "place:relay",
    "title": "The Relay",
    "section": "places",
    "text": "\"The mast on the high ridge. Dell Marchetti kept it up for a year, sending. He had four radios on the bench and a generator and he sent the county's distress on a loop every hour, and the only reply he ever got was ours coming back. Then he started listening instead. His log's still there. Read it. Then don't tell the others.\"",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "note:site:relay",
    "title": "The Relay · found on site",
    "section": "found",
    "text": "Heard Springfield again. 2:14 in the afternoon their time. Lawn furniture, half off. Sunny.\nRan the numbers. If it's afternoon there and the same night here, it's still the same night here. It's been the same night here the whole time. We're the ones stuck.\nNot telling Vera. She counts days. Let her have them.",
    "source": "Copied from the place",
    "circled": false
  },
  {
    "id": "place:cathedral",
    "title": "The Cathedral of Unlight",
    "section": "places",
    "text": "\"The Cathedral of Light. That's its name on the deeds — a pilgrimage church, Blackthorn money, on the ridge, too big for the county on purpose. The sign lost letters and somebody painted an UN on it and it stuck. Father Brand knelt at the altar on the first morning and kept the Vigil, which is the Easter service, the one where you wait in a dark church for the light to be carried in through the west door. He's still kneeling. He's the size of the altar now. The brazier at the west door is where the fire was to be lit. Nobody's lit it.\"",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "note:site:cathedral",
    "title": "The Cathedral of Unlight · found on site",
    "section": "found",
    "text": "THE VIGIL OF LIGHT · The church is in darkness. The people wait. The new fire is kindled outside the west door and carried in, and the deacon sings: THE LIGHT OF CHRIST. The people answer: THANKS BE TO GOD. Sunrise Mass to follow at 6:31.\n\nSix years of pencil ticks beside “The people wait.”",
    "source": "Copied from the place",
    "circled": false
  },
  {
    "id": "place:chapel",
    "title": "The Chapel",
    "section": "places",
    "text": "\"The little church on the ridge with the pilgrims' hospice behind it. Anders Kohl cast bells in the yard there for thirty years before he went past Jackfield. Upstairs in the ward there are three benches facing the end wall, and on the wall there's a shape. A person's shape, burned in, dark on the pale. It was the nurse. She was standing there on the first False Dawn when the light came up through the floor. It's the only picture of a person made by light in the county. The pilgrims sit and look at it.\"",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "note:site:chapel",
    "title": "The Chapel · found on site",
    "section": "found",
    "text": "her name was Cass · she saw it · it was warm · she said it was warm",
    "source": "Copied from the place",
    "circled": false
  },
  {
    "id": "place:gallowsfen",
    "title": "Gallowsfen Steeple",
    "section": "places",
    "text": "\"The drowned church in the fen. The county's wakes were held there for two hundred years. When the ground under us went hollow the fen came up and took it, and the sexton hung his lamp from the steeple so the dead could find the door. Fifteen coffins on the chancel, never buried. There's a table with a cloth over a shape and five candles. Don't lift the cloth. Shoot the lamp if you want the light. It's what he'd have wanted.\"",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "note:site:gallowsfen",
    "title": "Gallowsfen Steeple · found on site",
    "section": "found",
    "text": "WAKES HELD · 15 · BURIALS · 0 · GROUND · WET · LAMP · UP",
    "source": "Copied from the place",
    "circled": false
  },
  {
    "id": "place:drowned-light",
    "title": "The Drowned Light",
    "section": "places",
    "text": "\"The lighthouse on the reservoir shore. Ingrid Solvang kept it for the ferry and the fishing boats, and when Fenn took the nine boats out she kept it lit for them all night. When they came back folded she took the repair boat out to the lock to see for herself. The light went out that night. It's why we call it drowned. Her revolver's in the lamp room. She left it there because she knew what was in the water and she didn't want it on the boat.\"",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "note:site:drowned-light",
    "title": "The Drowned Light · found on site",
    "section": "found",
    "text": "Night 4. Nine boats out, 1:10. Lamps visible. 1:20 lamps visible. 1:30 eight lamps. 1:40 five. 1:50 one. 1:59 —\n\nThe next line begins the same entry again, in the same hand: 1:10.",
    "source": "Copied from the place",
    "circled": false
  },
  {
    "id": "place:hollow-mill",
    "title": "The Hollow Mill",
    "section": "places",
    "text": "\"Fisk's mill in the pines. You'll see the sails turning from a long way off, which is how you know something's wrong, because there hasn't been wind in this county in six years. The mill's driven off the old horse gear on the threshing floor — a ring and eight spokes that a horse used to walk in a circle. Something walks it now. The granary's empty; every sack went to the county reserve, and then the choir went into the reserve. Hollow is the right word.\"",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "note:site:hollow-mill",
    "title": "The Hollow Mill · found on site",
    "section": "found",
    "text": "stopped counting turns · Wendell says count nights instead · stopped counting nights",
    "source": "Copied from the place",
    "circled": false
  },
  {
    "id": "place:garden-of-rest",
    "title": "The Garden of Rest",
    "section": "places",
    "text": "\"The county cemetery on the ridge. Every stone faces east, because you rise to meet the light, and half of them say so, because Blackthorn's did. Hettie Marr buried her boy on the thirty-first and knelt down and she's the third one who never stood. The sexton dug the new graves facing the woods. He understood before I did. Twelve of them are fresh enough to open. Some of them open back.\"",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "note:site:garden-of-rest",
    "title": "The Garden of Rest · found on site",
    "section": "found",
    "text": "NEW BURIALS FACE WEST · NO EXCEPTIONS · I DON'T CARE WHAT THE STONE SAYS · — H. Ostrander, Sexton",
    "source": "Copied from the place",
    "circled": false
  },
  {
    "id": "place:bell-tower",
    "title": "The Bell Tower",
    "section": "places",
    "text": "\"The priory tower in the north pines, with the casting benches at the foot. Two bells fell — the old ones, the sexton tried to hang them higher to be heard further and the beams went. The one that's still up is the day bell. It's the one that was supposed to be rung before first light on the first of November to tell the dead the night was over. Nobody rang it. The sexton sat down on the ringing floor to wait for six o'clock and he's sitting there now. Ring it and everything in the county comes, because everything in the county has been waiting six years to hear it.\"",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "note:site:bell-tower",
    "title": "The Bell Tower · found on site",
    "section": "found",
    "text": "Rang the one o'clock. Waited. Clock says one again. Rang it again in case. Waiting for six. Will ring at six. — T.\nstill one.",
    "source": "Copied from the place",
    "circled": false
  },
  {
    "id": "place:jackfield",
    "title": "Jackfield Barn",
    "section": "places",
    "text": "\"The Jackfield farm on the east fields. Twelve rows of corn nobody harvested and three scarecrows that have been moved since I last looked. Old Jackfield's shotgun is in the barn. His west forty is the field nobody planted, and you know what came out of that. The rafters aren't safe. The stalls aren't safe. The loft is where they went to be nearer the sky.\"",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "note:site:jackfield",
    "title": "Jackfield Barn · found on site",
    "section": "found",
    "text": "Halloween · clocks back tonight · EXTRA HOUR OF SLEEP",
    "source": "Copied from the place",
    "circled": false
  },
  {
    "id": "place:standing-stones",
    "title": "The Standing Stones",
    "section": "places",
    "text": "\"The old ring in the works fields. Twelve stones, four lintels, an altar in the middle with a fire bowl on top and nine slabs leading up to it. They were here before the county, before the Blackthorns, before anything. Three of the stones have green in the cracks. The people who put them up knew something about where the sun goes at night that we had to learn the hard way. I think this is where they knelt first.\"",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "note:site:standing-stones",
    "title": "The Standing Stones · found on site",
    "section": "found",
    "text": "THE STANDING STONES · Ceremonial ring, origin unknown, est. 3,000 years. Local tradition held that a fire be kept here on the last night of October \"until the sun is rung up.\" The custom lapsed in 1922.",
    "source": "Copied from the place",
    "circled": false
  },
  {
    "id": "place:great-tree",
    "title": "The Great Tree",
    "section": "places",
    "text": "\"The copper oak in the pines. It's the only thing in the county that's still alive that isn't us, and it's warm — put your hand on the bark. It's on a warm place. Marnie Oakes kept the fire lookout on the deck up top and her book's still there. The last page before it happened is a drawing of the sunset. After that she counted lights.\"",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "note:site:great-tree",
    "title": "The Great Tree · found on site",
    "section": "found",
    "text": "Oct 31. Sunset 5:41. Clear. Drew it. (sketch) \nNov 1. No sunrise. The lighthouse and the church, same as always. Nothing else.\nNight 30. Eleven fires, not counting the two that were always there: the lock, the orchard, Kohl's cut, the silos, the works, the viaduct, the wedding in the fen, the conservatory, the crossing, the keep, and the lights on the backhoe in Jackfield's west field.\n— eleven. — eleven. — ten (the field). — nine (the lock). — nine. — eight (the silos went quiet, still lit, not counting it) —\nthree.\n\nThe last number is sixty pages after the others.",
    "source": "Copied from the place",
    "circled": false
  },
  {
    "id": "place:black-rib",
    "title": "The Black Rib",
    "section": "places",
    "text": "\"Seven black stone arches on the east ridge, thirty meters of them, like the ribs of something that died lying down. The old story is that this is what swallowed the sun the first time, and the first people cut it out, and the ribs are what's left. The dead walk under the arches to go down. You'll see them at the Black Hour, in a line, facing east. Don't stand in the line.\"",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "note:site:black-rib",
    "title": "The Black Rib · found on site",
    "section": "found",
    "text": "WHAT SWALLOWED IT WAS OPENED HERE\nOPEN IT AGAIN",
    "source": "Copied from the place",
    "circled": false
  },
  {
    "id": "place:mourning-glasshouse",
    "title": "The Mourning Glasshouse",
    "section": "places",
    "text": "\"The nursery out west in the fen. The sign said MORNING GLASS and somebody painted the U in the first year and nobody's taken it off. Twelve iron arches, most of the glass gone, eight beds. The Dunmore sisters ran it. There are three shapes hanging in the aisle wrapped in shade cloth. They wrapped themselves. They were going to sleep until spring. Don't cut them down. Em says the beds still put up sprouts, white, and they grow toward where the roof was.\"",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "note:site:mourning-glasshouse",
    "title": "The Mourning Glasshouse · found on site",
    "section": "found",
    "text": "MO(U)RNING GLASS NURSERY · Annuals · Perennials · Something For Every Season",
    "source": "Copied from the place",
    "circled": false
  },
  {
    "id": "place:choir-vault",
    "title": "The Choir Vault",
    "section": "places",
    "text": "\"The bell vault out west — nine great ribs and no roof, five bells hung from them. This is where the choir sang first, before the silos. Kohl hung the bells for them. The Pallbearers bring the dead here now, and set them down in the western chapels, and wait for the bells to ring, and they don't. Then they carry them on.\"",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "note:site:choir-vault",
    "title": "The Choir Vault · found on site",
    "section": "found",
    "text": "VIGIL OF LIGHT · 31 voices · Hold the final verse until the sun is visible from the walkway. — D.Q.",
    "source": "Copied from the place",
    "circled": false
  },
  {
    "id": "place:red-quarry",
    "title": "The Red Quarry",
    "section": "places",
    "text": "\"Crane's quarry in the north. Every headstone in the Garden came out of this rock, red, you can't mistake it. There's a block still hanging from the middle crane. It's the last one they cut. It's the size of a house and there's nothing carved on it. The quarrymen are hunters now. They keep dogs.\"",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "note:site:red-quarry",
    "title": "The Red Quarry · found on site",
    "section": "found",
    "text": "BLOCK 1 · RED · 9m x 4m x 3m · INSCRIPTION: TO FOLLOW",
    "source": "Copied from the place",
    "circled": false
  },
  {
    "id": "place:morning",
    "title": "Morning",
    "section": "places",
    "text": "\"The little planetarium at the far east end, past the outer ring. It was always called that — Morning was the hamlet, one road, a diner and this. It's where the county went to watch for the sunrise, because it's the easternmost thing we have. Emmett Sayer ran the projector. When the sun didn't come the crowd asked him to show them one, and he did, and they clapped. He ran it again. He ran it until they went to the ridge. He's not there. The book is. Iona says the seats are under a white roof. Fern says the seeds came from there — the ground's warm, things come up in the foyer cracks. Orla says it's circled on every map she has. It's a name. I don't think it's a promise. I think that's the point.\"",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "note:site:morning",
    "title": "Morning · found on site",
    "section": "found",
    "text": "Nov 1\n\nA pencil landscape: hills, a sun, rays.\n\nthis is all it ever was",
    "source": "Copied from the place",
    "circled": false
  },
  {
    "id": "address:candlehouse",
    "title": "The candle house",
    "section": "addresses",
    "text": "Mara. Candles mark the doors that will open; unlit ones mark the ones that won't.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "address:mender",
    "title": "The mender",
    "section": "addresses",
    "text": "Els. The blue flags on the walls were bedsheets. She still won't say if Morning is a name or a promise.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "address:bakehouse",
    "title": "The bread oven",
    "section": "addresses",
    "text": "Tomas. Never out. Ask why.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "address:infirmary",
    "title": "The quiet house",
    "section": "addresses",
    "text": "the infirmary. Door open, or door shut. Nothing in between.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "address:school",
    "title": "The old school",
    "section": "addresses",
    "text": "nineteen children. A sun on the wall drawn by a child who has never seen one.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "address:watch-home",
    "title": "The watch house",
    "section": "addresses",
    "text": "Ada. A wall of keys from the cars that never went out again.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "address:armourer",
    "title": "Moonrise arms",
    "section": "addresses",
    "text": "the weapons shop. Named for the only rising left.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "address:inn",
    "title": "The last room",
    "section": "addresses",
    "text": "the inn. Oren's rule: clean cup, no questions about where you slept.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "address:engine-house",
    "title": "The warm engine",
    "section": "addresses",
    "text": "Ari. The town's one car, kept running, never driven.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "address:soup-kitchen",
    "title": "The long table",
    "section": "addresses",
    "text": "Nell. One bowl set aside every night, always the same bowl.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "address:archive",
    "title": "The days we counted",
    "section": "addresses",
    "text": "Vera. Three hands in the first book, then moons.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "address:glasshouse",
    "title": "The moon garden",
    "section": "addresses",
    "text": "Em. Things that grow by moonlight, watched very closely.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "address:weaver-home",
    "title": "The blue shutters",
    "section": "addresses",
    "text": "a home. The shutters were painted blue in the first year so someone could see it from the ridge. Someone did.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "address:bell-keeper",
    "title": "The bell keeper",
    "section": "addresses",
    "text": "Hale. The rope is worn only on the side you pull for homecomings.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "address:north-home",
    "title": "The northern room",
    "section": "addresses",
    "text": "a home. Its window faces the conservatory. The curtain hasn't been opened in four years.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "address:memorial-house",
    "title": "The empty chairs",
    "section": "addresses",
    "text": "Seth. Purple cloth for the stair. Pale for the road.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "address:tallow-lane",
    "title": "The second candle",
    "section": "addresses",
    "text": "the candle house's overflow. The second candle in any window means the first one went out.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "address:dye-lane",
    "title": "Blue hands",
    "section": "addresses",
    "text": "the dye works. Everyone who worked there has blue hands, and the moon banners came from here.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "address:west-cooper",
    "title": "The barrel maker",
    "section": "addresses",
    "text": "a home now. He made the barrels the town lowers water in. He does not make bowls.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "address:east-herbs",
    "title": "The herb room",
    "section": "addresses",
    "text": "remedies. Ruth's overflow. Nothing here works on the threads.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "address:north-washer",
    "title": "The wash house",
    "section": "addresses",
    "text": "Linn. The Christmas houses, in her words, were waiting for a family that never arrived.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "address:north-lantern",
    "title": "The last lantern",
    "section": "addresses",
    "text": "candles. The last lantern is the one the town would carry if it had to leave, and it has not been lit, on purpose.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "address:upper-arms",
    "title": "Above the armourer",
    "section": "addresses",
    "text": "Merrit's rooms. Sleeps with the shop key in his hand.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "address:upper-inn",
    "title": "The blue room",
    "section": "addresses",
    "text": "inn overflow. Blue because it faces the shutters.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "address:upper-engine",
    "title": "The mechanic sleeps",
    "section": "addresses",
    "text": "Ari's. The sign was a joke from the first winter and he has kept it up.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "address:upper-kitchen",
    "title": "The seed room",
    "section": "addresses",
    "text": "the seeds from under the white roof at Morning. Counted every moon.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "address:upper-mender",
    "title": "The purple attic",
    "section": "addresses",
    "text": "Nessa's looms. The first moon banner was a blanket; the second was cut from the state's evacuation notices.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "address:upper-bakehouse",
    "title": "The flour room",
    "section": "addresses",
    "text": "the bakery's store. Six years of flour in a county that grows nothing. Ask Fern.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "address:upper-school",
    "title": "The star lesson",
    "section": "addresses",
    "text": "Iona's second classroom. Star charts and the nine turbines, for telling time by.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "address:upper-watch",
    "title": "The watch family",
    "section": "addresses",
    "text": "Ada's. Four chairs, three used.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "address:road-cobbler",
    "title": "The cobbler",
    "section": "addresses",
    "text": "outside the gate. Repaired boots appear in tended refuges; he denies it.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "address:road-smoke",
    "title": "The smoke house",
    "section": "addresses",
    "text": "outside. Meat from what, nobody asks.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "address:road-shelter",
    "title": "The borrowed bed",
    "section": "addresses",
    "text": "outside. Not an inn. A bed. Borrowed.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "address:road-glass",
    "title": "The bottle house",
    "section": "addresses",
    "text": "outside. Candles in bottles along the road to the gate, so the last hundred meters are lit.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "address:road-child",
    "title": "The red mitten",
    "section": "addresses",
    "text": "a home outside the walls. One red mitten nailed to the door, the size of a child's hand, found on the road.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "address:road-tins",
    "title": "The tinsmith",
    "section": "addresses",
    "text": "Bo's overflow. Made the nine-light boards.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "address:outer-arms",
    "title": "The road armourer",
    "section": "addresses",
    "text": "Fen. Sells to anyone. Was a Poacher. Stopped.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "address:outer-motor",
    "title": "The gate garage",
    "section": "addresses",
    "text": "Bo. Repairs, forty coins minimum, because forty is what a bulb costs and he will not charge less than a light.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "address:outer-home",
    "title": "The first warm window",
    "section": "addresses",
    "text": "the first house you see on the road in. Lit, always, for the same reason the station is.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "address:outer-kitchen",
    "title": "The travellers table",
    "section": "addresses",
    "text": "Min. Soup, outside the gate, before you've paid anything.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "resident:candlekeeper",
    "title": "Mara · candle keeper",
    "section": "people",
    "text": "Candles mark the doors that open. Mara keeps a bulb ready for anyone going out. She knows the difference between a dark window and a shut door.",
    "source": "A conversation kept",
    "circled": false
  },
  {
    "id": "resident:mender",
    "title": "Els · mender",
    "section": "people",
    "text": "The blue flags were bedsheets. She would like there to be enough sky for everyone. She still will not decide whether Morning is a name or a promise.",
    "source": "A conversation kept",
    "circled": false
  },
  {
    "id": "resident:baker",
    "title": "Tomas · baker",
    "section": "people",
    "text": "“Someone takes every shift.” His answer to why the ovens stay warm. He says it the same way every time. The stone under the ovens is warm too.",
    "source": "A conversation kept",
    "circled": false
  },
  {
    "id": "resident:nurse",
    "title": "Ruth · infirmary",
    "section": "people",
    "text": "Door open for help. Door closed for quiet. Ruth has stopped pulling the white threads from the mouths of the drowned. She says they go down further than a hand reaches.",
    "source": "A conversation kept",
    "circled": false
  },
  {
    "id": "resident:teacher",
    "title": "Iona · schoolkeeper",
    "section": "people",
    "text": "Nineteen children. Eleven were born in the dark. The younger ones copy the older ones’ suns. Iona has stopped correcting the color. She took them to Morning once. She will not take them again.",
    "source": "A conversation kept",
    "circled": false
  },
  {
    "id": "resident:watch-wife",
    "title": "Ada · the watch house",
    "section": "people",
    "text": "Four chairs at home. Three used. The patrol that went to the crossing came back on foot. Ada says to keep the car on the road, and she says it like somebody who has seen the alternative.",
    "source": "A conversation kept",
    "circled": false
  },
  {
    "id": "resident:innkeeper",
    "title": "Oren · innkeeper",
    "section": "people",
    "text": "Clean cup. No questions about where you slept. He can hear the silos from the inn. He has been sober for four years. I believe him.",
    "source": "A conversation kept",
    "circled": false
  },
  {
    "id": "resident:cook",
    "title": "Nell · cook",
    "section": "people",
    "text": "One bowl set aside every night. Always the same bowl. She takes it to the east stair. Hot food is the opposite of searching dead pockets; that is Nell’s rule for living.",
    "source": "A conversation kept",
    "circled": false
  },
  {
    "id": "resident:archivist",
    "title": "Vera · keeper of days",
    "section": "people",
    "text": "This is the ledger at The Days We Counted. I write down what people tell me. The small circle means I do not believe it. It is not a correction.\n\nThree hands in the first year. After that, moons. — V.",
    "source": "A conversation kept",
    "circled": false
  },
  {
    "id": "resident:gardener",
    "title": "Em · gardener",
    "section": "people",
    "text": "She carries soil inside in her coat. Grows things by moonlight and watches them very closely. She has seen the orchard trunks. She does not want them for the town garden.",
    "source": "A conversation kept",
    "circled": false
  },
  {
    "id": "resident:bellkeeper",
    "title": "Hale · bell keeper",
    "section": "people",
    "text": "He rings for homecomings. The rope is worn on that side. He knows about Kohl’s bell beyond Jackfield. When I ask about the priory’s day bell he says the trouble is knowing when.",
    "source": "A conversation kept",
    "circled": false
  },
  {
    "id": "resident:widower",
    "title": "Seth · the empty chairs",
    "section": "people",
    "text": "Purple cloth for the stair. Pale for the road. His brother Amos led the third group. The last name scratched by the stair is his. A chair can stay empty and still be taken.",
    "source": "A conversation kept",
    "circled": false
  },
  {
    "id": "resident:traveller",
    "title": "Joss · road traveller",
    "section": "people",
    "text": "Came in from the southeast on foot, past the viaduct. He says the light followed. He did not turn around. He explains the road to newcomers now, very carefully.",
    "source": "A conversation kept",
    "circled": false
  },
  {
    "id": "resident:roadcook",
    "title": "Min · gate cook",
    "section": "people",
    "text": "The soup is outside the gate. You have not paid anything yet. Min was at the charcoal works when they began burning again. She calls Marguerite Ashby the Saint, and then she serves another bowl.",
    "source": "A conversation kept",
    "circled": false
  },
  {
    "id": "resident:wellkeeper",
    "title": "Bram · well keeper",
    "section": "people",
    "text": "Lowers the bucket quietly. Heard water inside the folded boats. Says the thing with the ledger has his father’s hands. Bram says a lot. I write it down anyway.",
    "source": "A conversation kept",
    "circled": false
  },
  {
    "id": "resident:shrinekeeper",
    "title": "Leda · keeper of lamps",
    "section": "people",
    "text": "Trims every wick by hand, though the lamps below never seem to need it. She keeps the moon’s calendar too. After the conservatory she did not speak for a day. She still trimmed the lamps.",
    "source": "A conversation kept",
    "circled": false
  },
  {
    "id": "resident:roof-seamstress",
    "title": "Linn · the washing lines",
    "section": "people",
    "text": "The laundry does not move. Linn brings it in stiff. She says the Christmas houses were waiting for a family who never arrived. She remembers when waiting for someone meant setting a table.",
    "source": "A conversation kept",
    "circled": false
  },
  {
    "id": "resident:roof-baker",
    "title": "Aven · oven watch",
    "section": "people",
    "text": "One of the hands in the first book. She sits the late shift with Tomas. A warm chimney means somebody is awake. She has kept that promise.",
    "source": "A conversation kept",
    "circled": false
  },
  {
    "id": "resident:roof-gardener",
    "title": "Fern · roof garden",
    "section": "people",
    "text": "The seeds came from the foyer cracks under the white roof at Morning. She counts them every moon. I count moons. We are both keeping something.",
    "source": "A conversation kept",
    "circled": false
  },
  {
    "id": "resident:roof-teacher",
    "title": "Ansel · the lookout",
    "section": "people",
    "text": "Says roads make more sense from above, where you can see where they stop. Knows a forest road that ends between two trees with washing tied to them.",
    "source": "A conversation kept",
    "circled": false
  },
  {
    "id": "resident:roof-watch",
    "title": "Mae · roof watch",
    "section": "people",
    "text": "Watches the western field from the roof. Under it, she says. Whatever moves is under it. Keeps her feet on the stone when she crosses the bridges.",
    "source": "A conversation kept",
    "circled": false
  },
  {
    "id": "resident:keep-cook",
    "title": "Cora · common kitchen",
    "section": "people",
    "text": "The upper floors eat later. There are stairs. When someone comes back, Cora makes room at the table. She says we have never run out of chairs.",
    "source": "A conversation kept",
    "circled": false
  },
  {
    "id": "resident:keep-nurse",
    "title": "Edith · upper infirmary",
    "section": "people",
    "text": "Clean water by the bed. Let it thaw. The people who came back from the stair had the same old cut across the palm. Edith has said “old” twice. I have written it once.",
    "source": "A conversation kept",
    "circled": false
  },
  {
    "id": "resident:keep-reader",
    "title": "Orla · the map room",
    "section": "people",
    "text": "Collects every edition, including the false ones. Morning is circled on all of them. Values a crossed-out route: somebody came back to cross it out.",
    "source": "A conversation kept",
    "circled": false
  },
  {
    "id": "resident:keep-weaver",
    "title": "Nessa · the looms",
    "section": "people",
    "text": "The first moon banner was a blanket. The second was cut from evacuation notices. Good paper is hard to find. She makes the edges stronger now.",
    "source": "A conversation kept",
    "circled": false
  },
  {
    "id": "resident:keep-watcher",
    "title": "Ives · the high watch",
    "section": "people",
    "text": "Counts the fires from the roof. He notices every one that comes on. We ring the bell for people coming back. He says the lights are worth watching too.",
    "source": "A conversation kept",
    "circled": false
  },
  {
    "id": "resident:holdfast-arms",
    "title": "Merrit · armourer",
    "section": "people",
    "text": "Moonrise Arms. Keeps the barrels clean and the rounds dry. Sleeps upstairs with the shop key in his hand.",
    "source": "A conversation kept",
    "circled": false
  },
  {
    "id": "resident:holdfast-engine",
    "title": "Ari · engine keeper",
    "section": "people",
    "text": "The town’s car is kept running. It is never driven. The sign above his room says The Mechanic Sleeps. He kept it because it was a joke once.",
    "source": "A conversation kept",
    "circled": false
  },
  {
    "id": "resident:holdfast-road-arms",
    "title": "Fen · road armourer",
    "section": "people",
    "text": "Sells to anyone outside the gate. Was a Poacher. Stopped. We do not ask a person to pay six hundred coins before we let them load a gun.",
    "source": "A conversation kept",
    "circled": false
  },
  {
    "id": "resident:holdfast-gate-garage",
    "title": "Bo · gate mechanic",
    "section": "people",
    "text": "Forty coins minimum. A bulb costs forty, and Bo will not charge less than a light. His tinsmith made the nine-light boards. Every one has forty coins in it.",
    "source": "A conversation kept",
    "circled": false
  },
  {
    "id": "rule:carried-light",
    "title": "Carried light",
    "section": "rules",
    "text": "\"What you find out there is light. Not the lamp — the finding. It's in you, warm, and it stays in you until you give it to something lit. A refuge with the breaker on. A fire. A claimed place. The Holdfast. You can carry a lot of it. You shouldn't. When you're carrying too much, something comes to count it.\"",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "rule:powering",
    "title": "Powering and securing",
    "section": "rules",
    "text": "\"A place is powered when its light's on. It's secured when what was waiting in it has stopped. Those aren't the same thing, and the difference is the difference between a room you can sleep in and a room you can sleep in once.\"",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "rule:refuges",
    "title": "Refuges, and who keeps the light on",
    "section": "rules",
    "text": "\"Twelve real beds in the county. Power the room, shut the door — all the way, it starts ajar and it'll swing — and nothing ordinary can follow you in. The other kind can. Sleep and you'll wake healed and the night will have moved on without you, and once, if you've been gone long enough, you'll come back to find someone's been. Quilt folded. Boots mended. Kindling split. A note. Nobody in the Holdfast will admit to it.\"",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "rule:nine-lights",
    "title": "The nine lights",
    "section": "rules",
    "text": "\"Every bed in the county has the board next to it. Nine bulbs, four off. Bo's tinsmith made them for the children in the first year, after the turbines — make all nine come on at once, like the ridge does. You press the corners. Every child knows you press the corners. Forty coins in it, always, because Bo put forty in every one and nobody has the heart to take the rule away.\"",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "rule:coins",
    "title": "Coins",
    "section": "rules",
    "text": "\"Paper's gone. It went for notices and then it went for the looms. Coins are what's left, and coins are what the dead carry, because in the first year we started doing the old thing — a coin for the eyes, a coin for the road — and then we got hungry, and we started taking them back. The lanterns in the woods take coins. The Toll takes coins. The gate takes coins. You're paying the dead with the dead's own fare. Nell says that's why it's so hard to look at a body while you do it, and so easy afterward.\"",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "rule:bulbs",
    "title": "Bulbs",
    "section": "rules",
    "text": "\"Forty coins a bulb from anyone who has one, and it's the best forty you'll spend. A lit road is a road. The lamps go out because they're put out. Carry a spare. Mara says so and Mara is never wrong about a door.\"",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "rule:car",
    "title": "The car",
    "section": "rules",
    "text": "\"It's the only thing in the county that can carry as much wanting as we've got and keep moving. Keep it on the road. Keep it lit. Everything you take from the eleven goes on it, and it holds. Ada says the field threw one once, engine and all. Bo says forty coins minimum and he means it as a kindness.\"",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "service17",
    "title": "Service 17",
    "section": "road",
    "text": "Mrs Vale hung every Christmas light the street owned. Two minutes of day, twenty seconds of night. Supper on the table. A room ready for the child.\n\nThe letter to Cal says not to take the Service 17 route card. The road has fallen. Come the long way. The letter is still on the table. I do not know how you deliver a warning to somebody who is already on the road.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "house-below",
    "title": "The House Below",
    "section": "road",
    "text": "The Pruitt place went down with the road. The laundry stayed between the trees. There is a roof and a chimney halfway down the bowl, and light.\n\nSomebody scratched the route out on the notice: family below · lights on · do not use. I trust the scratched part more than the print.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "wrong-turn",
    "title": "Wrong Turn 106.7",
    "section": "road",
    "text": "Cal reads the official route card. ROAD OPEN. Then the music stops, and something comes down toward the house, and there is silence. Later there are two songs. Then Cal reads the card again.\n\nThe mast carries him. His mother has a radio. She has never found the station.",
    "source": "Vera’s ledger",
    "circled": true
  },
  {
    "id": "road:the-waiting",
    "title": "The Waiting",
    "section": "road",
    "text": "Forty chairs on the ridge. Coolers. A thermos on every armrest. The Sunrise Watch walked back from Morning and sat down to wait for the real one. Thirty-nine sit. Dot Halloran stands behind the empty chair. When your light moves, their heads move. Then they face east again.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "road:bleachers",
    "title": "The bleachers",
    "section": "road",
    "text": "SUNRISE WATCH · GO HAWKS. The school hauled the bleachers out by pickup and gave it three nights. They left them facing east. Nobody sits there now.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "road:sunflower-field",
    "title": "The sunflowers",
    "section": "road",
    "text": "They were planted to face the sun. At night sunflowers turn east and wait. These waited a long time. Now they follow headlights. The people standing in fields do the same thing.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "road:watch-tree",
    "title": "The Watch Tree",
    "section": "road",
    "text": "Everybody set their watches by different clocks after the fall-back. When the time stopped mattering they hung them in the tree, so the argument could go on without them. Every watch is running. Every watch says something between one and two.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "road:crossing",
    "title": "The crossing",
    "section": "road",
    "text": "Gates down. Bells ringing. No train. The freight went east for help. Ada says it came back changed. The crossing is still waiting to let it through.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "road:jam-segment",
    "title": "The evacuation",
    "section": "road",
    "text": "Eastbound, every car. Westbound, nothing. Dog beds, lamps, photographs. The things you can take in ten minutes. The people got out and walked. Some headlights are still on, until somebody sees them.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "wild:tower",
    "title": "The lookout towers",
    "section": "road",
    "text": "Marnie had colleagues. Every lookout book has a drawing of the last sunset. None of them knew the others were drawing it. There is usually something left at the top for the next person.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "wild:stand",
    "title": "Stands and treehouses",
    "section": "road",
    "text": "A lantern, a lawn chair, one boot. A rope ladder pulled up. First people lit a fire. Then they went as high as they could go.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "wild:chapel",
    "title": "Ruined chapels",
    "section": "road",
    "text": "Family chapels. No roof. An east window and a bench facing it. Nobody ever built a west window to wait beside.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "wild:foundation",
    "title": "Foundations",
    "section": "road",
    "text": "The settlement before the county. Stone-lined cellar holes, warm at the bottom. Older than the bells. I do not put my feet down them.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "wild:well",
    "title": "Wells",
    "section": "road",
    "text": "A rope, and a glow at the bottom. Bram says never look. He lowers his bucket very slowly. That is all he will say.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "wild:water",
    "title": "Ponds and streams",
    "section": "road",
    "text": "Warm water. Steam when the Black Hour comes. Nothing in them that belonged here before. Ruth will not drink from the fen.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "wild:wreck",
    "title": "Wrecks",
    "section": "road",
    "text": "A car canted in the trees. One headlight trying. The road was the last thing somebody trusted.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "wild:camp",
    "title": "Cabins and tents",
    "section": "road",
    "text": "Someone tried to live alone out here. There is a tally on the door frame. There is a last mark.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "wild:farm",
    "title": "Barns and farms",
    "section": "road",
    "text": "The scarecrows face east. They were put up facing north. The first time I told Ada, she asked who had moved them. The second time, she did not.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "wild:fence",
    "title": "Fences",
    "section": "road",
    "text": "A letterbox at the end. November mail. The fallen bays are where somebody crossed; the whole bay in the middle is where you will.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "wild:waystone",
    "title": "Waystones",
    "section": "road",
    "text": "Leaning stones at forks in the old roads. The people before the county marked their way with them. I leave them standing. The man who paces the road stops beside them.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "wild:culvert",
    "title": "Culverts",
    "section": "road",
    "text": "A pipe under the road. A wet sound. Warm air. The road keeps going above it. So should you.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "wild:pylon",
    "title": "Pylons",
    "section": "road",
    "text": "They took the power lines for copper in the first year. Rusted stubs on concrete pads. We went to generators after that. After the generators, nobody said what we went to.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "wild:blind",
    "title": "Hunting blinds",
    "section": "road",
    "text": "The slot faces away from the road. The hunters were watching what came out of the woods. The name carved inside is the dog’s.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "wild:orchard",
    "title": "Dead orchards",
    "section": "road",
    "text": "Rows of thin trees. Every one planted because somebody expected another spring. These are the ones that did not take.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "wild:cairn",
    "title": "Cairns",
    "section": "road",
    "text": "Nine stones. The old road markers. Always nine. Bo made the children’s boards with nine lights. Perhaps some things are remembered with the hands.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "wild:campfire",
    "title": "Campfires",
    "section": "road",
    "text": "Nine stones in the ring. Embers breathing. A log, a tarp, a pack. Somebody left a fire for you. They went east. Sit long enough to give it what you carried.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "wild:sanctuary",
    "title": "Lantern crowns",
    "section": "road",
    "text": "Six lanterns on iron ribs. A coin slot at hand height. Pay, and the woods become somewhere you can stop. I have watched a coin go in. It goes down.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "wild:dealer",
    "title": "The dealer",
    "section": "road",
    "text": "Two caged lamps on a steel workshop trailer. He moves camp. His weapon stays lowered until it needs to be raised. He sells bulbs. Nobody has asked him to promise anything.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "turbines",
    "title": "The nine turbines",
    "section": "county",
    "text": "Nine red lights on the ridge, blinking together. The sails do not turn. We call it the heartbeat. The children count them to sleep. The bedside boards were made after them: make all nine come on at once.",
    "source": "Vera’s ledger",
    "circled": false
  },
  {
    "id": "meteors",
    "title": "Falling stars",
    "section": "county",
    "text": "There are still stars. Sometimes one falls. Most of us stopped wishing in the first year. Iona says the children have not. She will not ask what they wish for.",
    "source": "Vera’s ledger",
    "circled": false
  }
].map(e=>Object.freeze(e)));
export const LORE_BY_ID = Object.freeze(Object.fromEntries(LORE_ENTRIES.map(e=>[e.id,e])));
export const VIGIL_IDS = Object.freeze(["blacktide", "rootmother", "bellwether", "choir", "furnace", "lantern", "mire", "moth", "antler", "underkeep", "fieldmaw"]);
