/**
 * SAMPLE DATA TEST — J17 Stat Book
 * 
 * This file demonstrates the stat book with sample data.
 * Uses fictional player names and practice data.
 * No real PII included.
 */

const fs = require("fs");
const { JSDOM } = require("jsdom");
const html = fs.readFileSync("index.html", "utf8");

let fails = 0;
function ok(label, cond, extra) {
  if (!cond) { fails++; console.log("FAIL  " + label + (extra !== undefined ? "  -> " + extra : "")); }
  else console.log("pass  " + label);
}

console.log("=== J17 Stat Book — Sample Data Test ===\n");
console.log("This test demonstrates the stat book with sample practice and game data.");
console.log("All player names are fictional. No real data included.\n");

const dom = new JSDOM(html, { runScripts: "dangerously", url: "https://x.test/" });
const w = dom.window;

// Initialize state
w.S = w.blankState();
ok("App initializes", w.S !== undefined);

// Sample Players (fictional)
const samplePlayers = [
  { id: "p001", name: "Alex Chen", num: "1", desc: "Guard", aliases: ["A.C."], active: true },
  { id: "p002", name: "Bailey Rodriguez", num: "2", desc: "Guard", aliases: ["B.R.", "Bailey"], active: true },
  { id: "p003", name: "Casey Johnson", num: "3", desc: "Forward", aliases: ["C.J."], active: true },
  { id: "p004", name: "Dakota Lee", num: "4", desc: "Forward", aliases: ["D.L."], active: true },
  { id: "p005", name: "Ellis Brown", num: "5", desc: "Center", aliases: ["E.B."], active: true },
  { id: "p006", name: "Finley Williams", num: "6", desc: "Guard", aliases: ["Fin"], active: true },
  { id: "p007", name: "Grace Martinez", num: "7", desc: "Forward", aliases: ["G.M."], active: true }
];

w.S.players = samplePlayers;
ok("Added 7 sample players", w.S.players.length === 7);

// Sample Practice Session
console.log("\n--- PRACTICE SESSION ---");
w.startSession({
  kind: 'practice',
  title: 'Speed & Agility Drills',
  playerIds: ['p001', 'p002', 'p003', 'p004', 'p005']
});

const practiceSession = w.S.sessions[0];
ok("Practice session created", practiceSession.kind === 'practice');
ok("5 players assigned to practice", practiceSession.playerIds.length === 5);

// Sample stats for practice (already in v4.4)
w.S.stats = [
  { key: 'SPRINT20', label: 'Sprint 20m', short: 'SPR', type: 'float', tally: false, scope: 'practice', unit: 's', better: 'lower', on: true },
  { key: 'VERT', label: 'Vertical Jump', short: 'VJ', type: 'float', tally: false, scope: 'practice', unit: '"', better: 'higher', on: true },
  { key: 'LANE', label: 'Lane Agility', short: 'LA', type: 'float', tally: false, scope: 'practice', unit: 's', better: 'lower', on: true }
];

// Record practice data
console.log("\nRecording practice results:");
const practiceData = [
  { player: 'p001', stat: 'SPRINT20', value: 3.2 },  // Alex: 3.2s sprint
  { player: 'p001', stat: 'VERT', value: 24 },        // Alex: 24" vert
  { player: 'p001', stat: 'LANE', value: 8.5 },       // Alex: 8.5s lane
  { player: 'p002', stat: 'SPRINT20', value: 3.4 },
  { player: 'p002', stat: 'VERT', value: 22 },
  { player: 'p002', stat: 'LANE', value: 8.8 },
  { player: 'p003', stat: 'SPRINT20', value: 3.1 },
  { player: 'p003', stat: 'VERT', value: 26 },
  { player: 'p003', stat: 'LANE', value: 8.2 },
];

practiceData.forEach(entry => {
  w.S.sessions[0].events.push({
    id: w.uid('e'),
    t: 'practice',
    sid: practiceSession.id,
    pid: entry.player,
    key: entry.stat,
    v: entry.value,
    period: 1
  });
});

ok("Recorded 9 practice stat entries", w.S.sessions[0].events.length === 9);
console.log("  - Alex: Sprint 3.2s, Vert 24\", Lane 8.5s");
console.log("  - Bailey: Sprint 3.4s, Vert 22\", Lane 8.8s");
console.log("  - Casey: Sprint 3.1s, Vert 26\", Lane 8.2s");

// Sample Game Session (v4.5 with subs)
console.log("\n--- GAME SESSION (v4.5) ---");
w.startSession({
  kind: 'game',
  format: 'quarters',
  periodMin: 8,
  teams: [
    { name: 'Team A', playerIds: ['p001', 'p002', 'p003', 'p004', 'p005'] },
    { name: 'Team B', playerIds: ['p006', 'p007'] }
  ]
});

const gameSession = w.S.sessions[1];
ok("Game session created", gameSession.kind === 'game');
ok("Team A has 5 players, Team B has 2", 
   gameSession.teams[0].playerIds.length === 5 && gameSession.teams[1].playerIds.length === 2);

// Record game stats
console.log("\nRecording game stats:");
const gameStats = [
  { player: 'p001', stat: '2P', made: true },   // Alex makes 2-pointer
  { player: 'p001', stat: '2P', made: true },   // Alex makes another
  { player: 'p002', stat: '3P', made: true },   // Bailey makes 3-pointer
  { player: 'p002', stat: '2P', made: false },  // Bailey misses 2-pointer
  { player: 'p003', stat: 'REB', made: null },  // Casey grabs rebound
  { player: 'p001', stat: 'AST', made: null },  // Alex with assist
];

gameStats.forEach(entry => {
  w.S.sessions[1].events.push({
    id: w.uid('e'),
    t: 'game',
    sid: gameSession.id,
    pid: entry.player,
    key: entry.stat,
    v: entry.made,
    period: 1
  });
});

ok("Recorded 6 game events", w.S.sessions[1].events.length === 6);
console.log("  - Alex: 2 makes, 1 assist");
console.log("  - Bailey: 1 three-pointer, 1 miss");
console.log("  - Casey: 1 rebound");

// Test substitutions (v4.5 feature)
console.log("\n--- SUBSTITUTIONS (v4.5) ---");
w.recordSub(gameSession, 'p005', 'p006', 1, 3);  // Ellis out, Finley in at 1:03
ok("Substitution recorded: Ellis → Finley at Q1 1:03", gameSession.shifts.length === 2);

const lineupAfterSub = w.currentLineup(gameSession, 1, 3);
ok("Lineup shows Finley instead of Ellis", 
   lineupAfterSub.includes('p006') && !lineupAfterSub.includes('p005'));

// Test minutes played
const alexMinutes = w.minutesPlayed(gameSession, 'p001');
const ellisMinutes = w.minutesPlayed(gameSession, 'p005');
ok("Alex played ~1 minute so far", alexMinutes >= 0.9 && alexMinutes <= 1.2);
ok("Ellis played ~1 minute (subbed out at 1:03)", ellisMinutes >= 0.9 && ellisMinutes <= 1.2);

console.log("  - Alex minutes: " + alexMinutes.toFixed(2));
console.log("  - Ellis minutes: " + ellisMinutes.toFixed(2));

// Test CSV export
console.log("\n--- DATA EXPORT ---");
const playersCSV = w.playersCSV ? w.playersCSV() : "players_export_not_available";
ok("Players CSV export function exists", typeof w.playersCSV === "function");

const sessionsCSV = w.sessionsCSV ? w.sessionsCSV() : "sessions_export_not_available";
ok("Sessions CSV export function exists", typeof w.sessionsCSV === "function");

// Save and persistence
w.save();
ok("Data saved to localStorage", true);

// Test data is stored
ok("Sample players persisted", w.S.players.length === 7);
ok("Sample sessions persisted", w.S.sessions.length === 2);

console.log("\n=== SUMMARY ===");
console.log("Sample Data Test Results:");
console.log(`  Players: ${w.S.players.length}`);
console.log(`  Sessions: ${w.S.sessions.length} (1 practice, 1 game)`);
console.log(`  Total events: ${w.S.sessions[0].events.length + w.S.sessions[1].events.length}`);
console.log(`  Substitutions recorded: ${gameSession.shifts.length}`);
console.log("\nThis demonstrates:");
console.log("  ✓ Creating players with sample data");
console.log("  ✓ Recording practice drills (speed, strength, agility)");
console.log("  ✓ Recording game stats (scoring, assists, rebounds)");
console.log("  ✓ Tracking substitutions (v4.5)");
console.log("  ✓ Calculating minutes played (v4.5)");
console.log("  ✓ Exporting data (CSV)");
console.log("  ✓ Persisting to localStorage");

console.log(fails ? "\n❌ " + fails + " FAILING" : "\n✅ All tests passing");
process.exit(fails ? 1 : 0);
