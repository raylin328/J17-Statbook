const fs = require("fs");
const { JSDOM } = require("jsdom");
const html = fs.readFileSync(require("./app-path"), "utf8");

let fails = 0;
function ok(label, cond, extra) {
  if (!cond) { fails++; console.log("FAIL  " + label + (extra ? " -> " + extra : "")); }
  else console.log("pass  " + label);
}
function boot(seed) {
  return new JSDOM(html, {
    runScripts: "dangerously", url: "https://x.test/",
    beforeParse(w) { if (seed) w.localStorage.setItem("j17.statbook.v2", JSON.stringify(seed)); }
  });
}
function w(dom) { return dom.window; }

// seed with a game and some events
const seed = {
  v: 2, prefs: { gameView: "grid" },
  players: [
    { id: "p1", name: "Riley Park", desc: "black", aliases: ["Rylee Park"], notes: "best 3pt", active: true },
    { id: "p2", name: "Dana Ortiz", desc: "", aliases: [], notes: "", active: true }
  ],
  stats: null,
  sessions: [{
    id: "s1", date: 1725360000000, kind: "game", format: "quarters", period: "Q2", done: false,
    title: "Scrimmage 2026-09-02",
    teams: [
      { name: "Black", playerIds: ["p1", "p2"] },
      { name: "White", playerIds: [] }
    ],
    playerIds: [],
    finalScore: [69, 71],
    events: [
      { id: "e1", t: 1725360100, sid: "s1", pid: "p1", key: "3P", v: 1, period: "Q1", team: 0 },
      { id: "e2", t: 1725360200, sid: "s1", pid: "p1", key: "2P", v: 1, period: "Q1", team: 0 },
      { id: "e3", t: 1725360300, sid: "s1", pid: "p2", key: "REB", v: 1, period: "Q2", team: 0 }
    ],
    notes: "good game"
  }],
  activeId: "s1"
};

const A = boot(seed);
const aw = w(A);

// ---------- export produces valid CSV ----------
const playerCSV = aw.eval("playersCSV()");
const sessionCSV = aw.eval("sessionsCSV()");
const eventCSV = aw.eval("eventsCSV()");

ok("players CSV has header", playerCSV.split("\n")[0] === "id,name,jersey number,category,desc,aliases,notes");  // v4.6: + category
ok("players CSV has Riley", playerCSV.indexOf("p1,Riley Park,,Miscellaneous,black,Rylee Park,best 3pt") > -1, playerCSV.split("\n")[1]);
ok("sessions CSV has header", sessionCSV.split("\n")[0] === "id,date,kind,format,title,team1_name,team1_players,team2_name,team2_players,final_score_1,final_score_2,period_min,done,notes");
ok("sessions CSV has the game", sessionCSV.indexOf("s1,1725360000000,game,quarters") > -1);
ok("teams encoded as pipe-delimited", sessionCSV.indexOf("Black,p1|p2,White") > -1);
ok("events CSV has header", eventCSV.split("\n")[0] === "id,session_id,player_id,stat_key,value,period,team,timestamp,made,x,y,clock");
ok("events CSV has all 3 events", eventCSV.split("\n").length === 4);
ok("event includes period and team", eventCSV.split("\n")[2].indexOf(",Q1,0,") > -1);

// ---------- import creates identical state ----------
const B = boot(null);
const bw = w(B);

bw.eval(`importFromCSVs(${JSON.stringify(playerCSV)}, ${JSON.stringify(sessionCSV)}, ${JSON.stringify(eventCSV)})`);
ok("import parsed all data", bw.eval("S.players.length") === 2 && bw.eval("S.sessions.length") === 1 && bw.eval("S.sessions[0].events.length") === 3);
ok("player IDs preserved", bw.eval("S.players.map(p=>p.id).join()") === "p1,p2");
ok("player names preserved", bw.eval("S.players[0].name") === "Riley Park");
ok("aliases parsed from CSV", bw.eval("S.players[0].aliases.join('|')") === "Rylee Park");
ok("session ID preserved", bw.eval("S.sessions[0].id") === "s1");
ok("session date preserved", bw.eval("S.sessions[0].date") === 1725360000000);
ok("teams reconstructed", bw.eval("S.sessions[0].teams[0].playerIds.join()") === "p1,p2");
ok("final score restored", bw.eval("S.sessions[0].finalScore.join()") === "69,71");
ok("events reconstructed with correct values", bw.eval("S.sessions[0].events[0].key") === "3P" && bw.eval("S.sessions[0].events[0].v") === 1);
ok("event period preserved", bw.eval("S.sessions[0].events[2].period") === "Q2");
ok("event team preserved", bw.eval("S.sessions[0].events[0].team") === 0);

// ---------- round-trip is lossless ----------
const reexport = bw.eval("eventsCSV()");
ok("re-export has same events", reexport.split("\n").length === eventCSV.split("\n").length);
const linesSame = eventCSV.split("\n").every(line => reexport.indexOf(line) > -1);
ok("re-export lines match original", linesSame, linesSame ? "" : "some lines differ");

// ---------- import is idempotent ----------
bw.eval(`importFromCSVs(${JSON.stringify(playerCSV)}, ${JSON.stringify(sessionCSV)}, ${JSON.stringify(eventCSV)})`);
ok("re-importing same CSVs adds nothing", bw.eval("S.players.length") === 2 && bw.eval("S.sessions[0].events.length") === 3);

// ---------- merge by ID ----------
const C = boot(null);
const cw = w(C);

// import the first game
cw.eval(`importFromCSVs(${JSON.stringify(playerCSV)}, ${JSON.stringify(sessionCSV)}, ${JSON.stringify(eventCSV)})`);
ok("first import loads data", cw.eval("S.sessions.length") === 1);

// add a new player and event
cw.eval("S.players.push({id:'p3', name:'Casey Lin', desc:'', aliases:[], notes:'', active:true}); S.sessions[0].events.push({id:'e4', t:1725360400, sid:'s1', pid:'p3', key:'AST', v:1, period:'Q3', team:0});");

// export the expanded state
const expandedPlayers = cw.eval("playersCSV()");
const expandedEvents = cw.eval("eventsCSV()");

// reimport into a fresh instance
const D = boot(null);
const dw = w(D);
dw.eval(`importFromCSVs(${JSON.stringify(expandedPlayers)}, ${JSON.stringify(sessionCSV)}, ${JSON.stringify(expandedEvents)})`);
ok("expanded import has 3 players", dw.eval("S.players.length") === 3);
ok("expanded import has new player", dw.eval("S.players[2].name") === "Casey Lin");
ok("expanded import has 4 events", dw.eval("S.sessions[0].events.length") === 4);
ok("new event is there", dw.eval("S.sessions[0].events[3].key") === "AST");

// ---------- scoring calculation unchanged by CSV round-trip ----------
const origScore = aw.eval("teamScore(activeSession(), 0)");
const importedScore = bw.eval("teamScore(S.sessions[0], 0)");
ok("scoring identical after import", origScore === importedScore, origScore + " vs " + importedScore);

// ---------- CSV exported by export function imports cleanly ----------
const E = boot(null);
const ew = w(E);
aw.nav = i => console.log("nav(" + i + ")");
const backupCSVs = {
  players: aw.eval("playersCSV()"),
  sessions: aw.eval("sessionsCSV()"),
  events: aw.eval("eventsCSV()")
};
const result = ew.eval(`importFromCSVs(${JSON.stringify(backupCSVs.players)}, ${JSON.stringify(backupCSVs.sessions)}, ${JSON.stringify(backupCSVs.events)})`);
ok("export/import cycle", result.players > 0 && result.sessions > 0 && result.events > 0);

console.log(fails ? "\n" + fails + " FAILING" : "\nall green");
process.exit(fails ? 1 : 0);
