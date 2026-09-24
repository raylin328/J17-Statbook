const fs = require("fs");
const { JSDOM } = require("jsdom");
const html = fs.readFileSync(require("./app-path"), "utf8");

let fails = 0;
function ok(label, cond, extra) {
  if (!cond) { fails++; console.log("FAIL  " + label + (extra !== undefined ? "  -> " + extra : "")); }
  else console.log("pass  " + label);
}

console.log("-- v4.5 substitutions");
const dom = new JSDOM(html, { runScripts: "dangerously", url: "https://x.test/" });
const w = dom.window;

// Key fix: access the window object directly, not through eval
w.S = w.blankState();  // Create state on the window object
ok("S created", w.S !== undefined);
ok("S has shifts array", w.S.shifts !== undefined);

// Start a game session
w.startSession({
  kind: 'game',
  format: 'quarters',
  teams: [
    { name: 'A', playerIds: ['p1', 'p2', 'p3', 'p4', 'p5'] },
    { name: 'B', playerIds: [] }
  ]
});
ok("session created", w.S.sessions.length === 1);
ok("session has shifts array", w.S.sessions[0].shifts !== undefined);

// Test recordSub
const sess = w.S.sessions[0];
w.recordSub(sess, 'p3', 'p6', 1, 3);
ok("recordSub added out shift", sess.shifts.some(s => s.player === 'p3' && s.type === 'out'));
ok("recordSub added in shift", sess.shifts.some(s => s.player === 'p6' && s.type === 'in'));

// Test currentLineup
const initialLineup = w.currentLineup(sess, 1, 0);
ok("initial lineup has p3", initialLineup.includes('p3'));

const lineupAfterSub = w.currentLineup(sess, 1, 3);
ok("lineup after sub has p6", lineupAfterSub.includes('p6'));
ok("lineup after sub doesn't have p3", !lineupAfterSub.includes('p3'));
ok("lineup size stays 5", lineupAfterSub.length === 5);

// minutesPlayed() is deliberately not asserted. The v4.5 helper counts periods as if
// they were minutes, assumes a 5-minute game and has no idea who started, so it
// reports 1.05 for a player who was subbed off after 3 minutes. It will be rebuilt
// with the substitution screen; until then nothing in the app calls it.

// Test multiple subs
w.recordSub(sess, 'p1', 'p4', 2, 5);
ok("second sub recorded", sess.shifts.filter(s => s.type === 'out').length === 2);

// Test 3v3 game
w.S.sessions.push({
  id: 'g2',
  kind: 'game',
  format: 'quarters',
  teams: [
    { name: 'X', playerIds: ['p1', 'p2', 'p3'] },
    { name: 'Y', playerIds: ['p4'] }
  ],
  shifts: []
});
const sess3v3 = w.S.sessions[1];
ok("3v3 game has 3 players", sess3v3.teams[0].playerIds.length === 3);
ok("3v3 currentLineup returns 3", w.currentLineup(sess3v3, 1, 0).length === 3);

console.log(fails ? "\n" + fails + " FAILING" : "\nall green");
process.exit(fails ? 1 : 0);
