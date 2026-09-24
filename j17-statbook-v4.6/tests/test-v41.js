const fs = require("fs");
const { JSDOM } = require("jsdom");
const html = fs.readFileSync(require("./app-path"), "utf8");

let fails = 0;
function ok(label, cond, extra) {
  if (!cond) { fails++; console.log("FAIL  " + label + (extra !== undefined ? "  -> " + extra : "")); }
  else console.log("pass  " + label);
}
function boot(seed, src) {
  return new JSDOM(src || html, {
    runScripts: "dangerously", url: "https://x.test/", pretendToBeVisual: true,
    beforeParse(w) { if (seed) w.localStorage.setItem("j17.statbook.v2", JSON.stringify(seed)); }
  });
}
function H(dom) {
  const d = dom.window.document, w = dom.window;
  return {
    w, d,
    $: s => d.querySelector(s), $$: s => Array.from(d.querySelectorAll(s)),
    ev: x => w.eval(x),
    click(e) { if (!e) throw new Error("click on missing element"); e.dispatchEvent(new w.Event("click", { bubbles: true })); },
    type(e, v) { e.value = v; e.dispatchEvent(new w.Event("input", { bubbles: true })); },
    byText(sel, t) { return Array.from(d.querySelectorAll(sel)).find(e => e.textContent.trim().startsWith(t)); },
    cell(pid, key) { return d.querySelector('.cell[data-pid="' + pid + '"][data-key="' + key + '"]'); }
  };
}
const P = (id, name) => ({ id, name, aliases: [], desc: "", notes: "", active: true });
function gameSeed(extra) {
  return Object.assign({
    v: 3, prefs: { gameView: "grid" }, players: [P("p1", "Riley Park"), P("p2", "Dana Ortiz"), P("p3", "Ari Kim")],
    stats: null,
    sessions: [{ id: "g", date: Date.now(), kind: "game", format: "quarters", period: "Q1", done: false,
      periodMin: 8, teams: [{ name: "Black", playerIds: ["p1", "p2"] }, { name: "White", playerIds: ["p3"] }],
      playerIds: [], finalScore: [null, null], events: [], notes: "" }],
    activeId: "g"
  }, extra || {});
}

/* ================= 1. data types ================= */
console.log("\n-- data types");
{
  const A = H(boot(gameSeed()));
  const addStat = (label, scope, type, opts) => {
    A.ev("UI.tab='stats'; render();");
    const f = A.$$(".card").pop();
    const ins = f.querySelectorAll("input"), sels = f.querySelectorAll("select");
    A.type(ins[0], label); sels[0].value = scope; sels[1].value = type;
    sels[1].dispatchEvent(new A.w.Event("change"));
    if (opts && opts.better) sels[2].value = opts.better;
    if (opts && opts.unit) A.type(ins[1], opts.unit);
    if (opts && opts.pts) A.type(ins[2], String(opts.pts));
    if (opts && opts.min !== undefined) { A.type(ins[3], String(opts.min)); A.type(ins[4], String(opts.max)); }
    A.click(A.byText("button", "Add stat"));
    return A.ev("S.stats.find(s => s.label === " + JSON.stringify(label) + ")");
  };
  ok("type picker offers six types", (() => { A.ev("UI.tab='stats'; render();");
    return A.$$(".card").pop().querySelectorAll("select")[1].options.length === 6; })());

  const hustle = addStat("Hustle", "practice", "scale", { min: 1, max: 5 });
  ok("scale stat stored with bounds", hustle && hustle.type === "scale" && hustle.min === 1 && hustle.max === 5);
  const shoes = addStat("Wore proper shoes", "practice", "boolean");
  ok("boolean stat stored", shoes && shoes.type === "boolean" && !shoes.tally);
  const note = addStat("Coach note", "practice", "text");
  ok("text stat stored", note && note.type === "text");
  const wt = addStat("Body weight", "practice", "float", { better: "none", unit: "lbs" });
  ok("float with 'neither' direction", wt && wt.better === "none" && wt.unit === "lbs");
  const push = addStat("Push-ups", "practice", "integer");
  ok("practice integer is not a tally", push && push.tally === false && push.better === "higher");
  const dunk = addStat("Dunk", "game", "integer", { pts: 2 });
  ok("game integer is a tally with points", dunk && dunk.tally === true && dunk.pts === 2);
  const charge = addStat("Took a charge", "game", "boolean");
  ok("game boolean is not a tally", charge && charge.tally === false);
  const bad = (() => { const before = A.ev("S.stats.length"); addStat("Broken", "practice", "scale", { min: 5, max: 5 });
    return A.ev("S.stats.length") === before; })();
  ok("scale with min >= max is refused", bad);

  // practice session to use them
  A.ev("startSession({kind:'practice', title:'Test day', playerIds:['p1','p2']});");
  const pick = (label) => { A.click(A.byText(".chips .chip", label)); };
  const selectP1 = () => { A.click(A.$$(".plr")[0]); };

  pick("Hustle"); selectP1();
  const rng = A.$("#pracIn");
  ok("scale shows a slider", rng && rng.type === "range" && rng.min === "1" && rng.max === "5");
  rng.value = "4"; rng.dispatchEvent(new A.w.Event("input"));
  ok("slider value shown live", A.$(".scaleval").textContent === "4");
  A.click(A.byText(".btn", "Record"));
  ok("slider value recorded as a number", A.ev("activeSession().events.slice(-1)[0].v") === 4);
  ok("scale formats as n/max", A.$$(".plr")[0].textContent.indexOf("4/5") > -1, A.$$(".plr")[0].textContent);

  pick("Wore proper shoes"); selectP1();
  A.click(A.byText(".btn", "Yes"));
  selectP1(); // it stays selected; re-selecting would clear — check first
  ok("boolean recorded true", A.ev("activeSession().events.slice(-1)[0].v") === true);
  if (!A.$("#view").textContent.includes("Yes")) selectP1();
  A.ev("UI.sel='p1'; render();");
  A.click(A.byText(".btn", "No"));
  ok("boolean recorded false", A.ev("activeSession().events.slice(-1)[0].v") === false);
  ok("boolean summarised as yes count", A.$$(".plr")[0].textContent.indexOf("1/2 yes") > -1, A.$$(".plr")[0].textContent);

  pick("Coach note"); A.ev("UI.sel='p1'; render();");
  ok("text shows a text box", A.$("#pracIn").type === "text");
  A.click(A.byText(".btn", "Record"));
  ok("empty note refused", !A.ev("activeSession().events.some(e => e.key === '" + note.key + "')"));
  A.type(A.$("#pracIn"), "Great effort, closeouts improving");
  A.click(A.byText(".btn", "Record"));
  ok("note stored as text", A.ev("activeSession().events.slice(-1)[0].v") === "Great effort, closeouts improving");

  pick("Push-ups"); A.ev("UI.sel='p1'; render();");
  A.type(A.$("#pracIn"), "12.5"); A.click(A.byText(".btn", "Record"));
  ok("integer refuses decimals", !A.ev("activeSession().events.some(e => e.key === '" + push.key + "')"));
  A.type(A.$("#pracIn"), "30"); A.click(A.byText(".btn", "Record"));
  A.type(A.$("#pracIn"), "34"); A.click(A.byText(".btn", "Record"));
  ok("integer keeps the best, not the sum", A.$$(".plr")[0].textContent.indexOf("34 (2)") > -1, A.$$(".plr")[0].textContent);

  pick("Body weight"); A.ev("UI.sel='p1'; render();");
  A.type(A.$("#pracIn"), "121.5"); A.click(A.byText(".btn", "Record"));
  A.type(A.$("#pracIn"), "119"); A.click(A.byText(".btn", "Record"));
  ok("'neither' keeps the latest", A.$$(".plr")[0].textContent.indexOf("119 lbs") > -1, A.$$(".plr")[0].textContent);

  // time: stopwatch plus typed fallback
  pick("Full court sprint"); A.ev("UI.sel='p1'; render();");
  const typed = A.$$("#view input[type=number]").find(i => /seconds/.test(i.placeholder));
  ok("time drill offers typed seconds too", !!typed);
  A.type(typed, "5.8"); A.click(A.byText(".btn", "Save typed time"));
  ok("typed time recorded", A.ev("activeSession().events.slice(-1)[0].v") === 5.8);

  // report card handles every type
  A.ev("UI.tab='card'; UI.card='p1'; render();");
  const card = A.$("#view").textContent;
  ok("report card lists the slider", /Hustle4\/5/.test(card), card.slice(0, 400));
  ok("report card lists yes/no", /Wore proper shoes1\/2 yes/.test(card));
  ok("report card lists the note", card.indexOf("closeouts improving") > -1);
  ok("no change arrow on text", /closeouts improving—/.test(card));
  const cardCsv = A.ev("cardCSV('p1')");
  ok("report card CSV has typed rows", cardCsv.indexOf("Wore proper shoes,1/2 yes,No,2") > -1, cardCsv);

  // game-side typed stat opens an entry panel instead of tallying
  A.ev("S.activeId='g'; UI.tab='session'; UI.team=0; render();");
  const chargeCell = A.cell("p1", charge.key);
  ok("typed game stat appears in the grid", !!chargeCell && chargeCell.classList.contains("entry"));
  A.click(chargeCell);
  ok("tapping it opens an entry panel", /Riley Park · Took a charge/.test(A.$(".dock").textContent));
  A.click(A.byText(".btn", "Yes"));
  ok("entry recorded and panel closes", A.ev("activeSession().events.slice(-1)[0].v") === true && !A.ev("UI.entry"));
  ok("score unaffected by typed stat", A.$(".tscore").textContent === "0");
  A.click(A.cell("p1", dunk.key));
  ok("custom scoring tally adds its points", A.$(".tscore").textContent === "2");
}

/* ================= 2. shot chart ================= */
console.log("\n-- shot chart");
{
  const A = H(boot(gameSeed()));
  A.click(A.$$(".viewsw .chip").find(c => c.textContent === "Chart shots"));
  ok("chart toggle turns on", A.ev("S.prefs.chartShots") === true);
  A.click(A.cell("p1", "3P"));
  ok("3P tap opens the court", !!A.$(".overlay .court"));
  ok("nothing recorded until placed", A.ev("activeSession().events.length") === 0);
  A.click(A.byText(".overlay .btn", "Cancel"));
  ok("cancel records nothing", !A.$(".overlay") && A.ev("activeSession().events.length") === 0);

  A.click(A.cell("p1", "3P"));
  A.ev("placeShot(0.1, 0.5)");
  ok("placed make recorded", A.ev("activeSession().events.length") === 1 && A.$(".tscore").textContent === "3");
  ok("position stored as court fraction", A.ev("activeSession().events[0].x") === 0.1 && A.ev("activeSession().events[0].y") === 0.5);

  A.click(A.cell("p1", "2P"));
  A.click(A.byText(".overlay .btn", "Missed"));
  ok("missed toggle selected", A.ev("UI.shot.made") === false);
  A.ev("placeShot(0.5, 0.2)");
  ok("miss recorded but scores nothing", A.ev("activeSession().events.length") === 2 && A.$(".tscore").textContent === "3");
  ok("miss does not count as a make", A.cell("p1", "2P").textContent === "0");
  ok("cell notes the miss", A.cell("p1", "2P").getAttribute("title") === "1 missed");

  A.click(A.cell("p1", "2P"));
  A.click(A.byText(".overlay .btn", "Save without a spot"));
  ok("make without a spot still counts", A.$(".tscore").textContent === "5" &&
    A.ev("typeof activeSession().events[2].x") === "undefined");

  A.click(A.cell("p1", "1P"));
  ok("free throws skip the court", !A.$(".overlay") && A.$(".tscore").textContent === "6");
  A.click(A.cell("p1", "REB"));
  ok("rebounds skip the court", !A.$(".overlay"));

  // minus removes makes, never misses
  A.click(A.byText(".undo .btn", "Minus"));
  A.click(A.cell("p1", "2P"));
  ok("minus removed the make", A.$(".tscore").textContent === "4");
  ok("the miss survives minus", A.ev("activeSession().events.filter(e => e.miss).length") === 1);
  A.click(A.byText(".undo .btn", "Minus"));

  // off: back to one tap
  A.click(A.$$(".viewsw .chip").find(c => c.textContent === "Chart shots"));
  A.click(A.cell("p3", "2P") || (A.click(A.$$(".teamtab")[1]), A.cell("p3", "2P")));
  ok("chart off: 2P is one tap again", !A.$(".overlay"));

  // tiles workflow also charts
  A.ev("S.prefs.chartShots = true; S.prefs.gameView = 'tiles'; UI.team = 0; render();");
  A.click(A.$$(".plr")[0]);
  A.click(A.byText(".act", "+3"));
  ok("tiles view opens the court too", !!A.$(".overlay .court"));
  A.ev("placeShot(0.9, 0.3)");

  // box score chart
  A.ev("UI.tab='box'; render();");
  ok("shot chart drawn on box score", !!A.$("#view .court"));
  ok("makes drawn as dots", A.$$("#view .court .mk").length === 2, A.$$("#view .court .mk").length);
  ok("misses drawn as crosses", A.$$("#view .court .ms").length === 1);
  const fg = A.$$("#view table").pop().querySelector("tbody tr").textContent;
  ok("FG line for Riley: 2P 0/1 (minus removed the make), 3P 2/2, 67%", fg === "Riley Park0/12/267%", fg);
  const sel = A.$("#view .card select");
  sel.value = "t1"; sel.dispatchEvent(new A.w.Event("change"));
  ok("filter to White shows no Black shots", A.$$("#view .court .mk").length === 0);

  // log
  A.ev("UI.tab='log'; render();");
  ok("log labels the miss", A.$("#view").textContent.indexOf("2-pointer (missed)") > -1);
  ok("log marks charted shots", A.$("#view").textContent.indexOf("charted") > -1);
}

/* ================= 3. game clock ================= */
console.log("\n-- game clock");
{
  const A = H(boot(gameSeed()));
  ok("clock shows full period before it starts", A.$("#clockFace").textContent === "8:00");
  const realNow = A.w.Date.now;
  let fake = 1000000;
  A.w.Date.now = () => fake;
  A.click(A.$(".clockbtn"));
  ok("clock starts", A.ev("activeSession().clock.since") === fake);
  fake += 65000;
  ok("time runs down", A.ev("fmtClock(clockLeft(activeSession()))") === "6:55");
  A.click(A.cell("p1", "2P"));
  ok("events stamped with game time", A.ev("activeSession().events[0].clk") === 415000);
  A.click(A.$(".clockbtn"));
  ok("clock stops and holds", A.ev("activeSession().clock.since") === null && A.$("#clockFace").textContent === "6:55");
  fake += 30000;
  ok("stopped clock does not move", A.$("#clockFace").textContent === "6:55" && A.ev("clockLeft(activeSession())") === 415000);

  // survives a reload while running
  A.click(A.$(".clockbtn"));
  const saved = JSON.parse(A.w.localStorage.getItem("j17.statbook.v2"));
  const B = H(boot(saved));
  B.w.Date.now = () => fake + 10000;
  ok("reload picks up the running clock", B.ev("fmtClock(clockLeft(activeSession()))") === "6:45");

  // period change resets
  A.w.Date.now = () => fake;
  const per = A.$(".per"); per.value = "Q2"; per.dispatchEvent(new A.w.Event("change"));
  ok("new period resets the clock", A.$("#clockFace").textContent === "8:00" && !A.ev("activeSession().clock.since"));

  A.ev("clockSetTo(90000)");
  ok("clock can be set", A.$("#clockFace").textContent === "1:30");
  A.click(A.byText(".clkctl button", "Reset"));
  ok("reset returns to period length", A.$("#clockFace").textContent === "8:00");

  // runs out
  A.ev("clockSetTo(1000); clockToggle();");
  fake += 5000;
  ok("never goes negative", A.ev("clockLeft(activeSession())") === 0);
  A.w.Date.now = realNow;

  // period length from setup
  const C = H(boot({ v: 3, prefs: {}, players: [P("a", "A"), P("b", "B")], stats: null, sessions: [], activeId: null }));
  const mins = C.$$("#view input[type=number]")[0];
  C.type(mins, "10");
  C.ev("UI.setup.picks = [['a'],['b']];");
  C.click(C.byText("button", "Start game"));
  ok("setup's period length drives the clock", C.$("#clockFace").textContent === "10:00");
}

/* ================= 4. schema 3 migration and compatibility ================= */
console.log("\n-- migration");
{
  const v2 = { v: 2, prefs: { gameView: "grid" }, players: [P("p1", "Riley Park")],
    stats: [
      { key: "2P", label: "2-pointer", short: "2P", kind: "count", scope: "game", pts: 2, on: true },
      { key: "VERT", label: "Vertical jump", short: "VERT", kind: "measure", unit: "in", scope: "practice", on: true },
      { key: "SPR34", label: "3/4 sprint", short: "SPR", kind: "time", unit: "s", scope: "practice", lowerBetter: true, on: true },
      { key: "LANE", label: "Lane agility", short: "LANE", kind: "time", unit: "s", scope: "practice", lowerBetter: true, on: true },
      { key: "REPS", label: "Old custom count", short: "REPS", kind: "count", scope: "practice", on: true }
    ],
    sessions: [{ id: "pr", date: 1, kind: "practice", title: "Old", playerIds: ["p1"], teams: [], finalScore: [null, null],
      events: [{ id: "e1", t: 1, sid: "pr", pid: "p1", key: "SPR34", v: 3.4 },
               { id: "e2", t: 2, sid: "pr", pid: "p1", key: "REPS", v: 5 },
               { id: "e3", t: 3, sid: "pr", pid: "p1", key: "REPS", v: 7 }], notes: "" }],
    activeId: "pr" };
  const A = H(boot(v2));
  ok("v2 data opens and becomes v3", A.ev("S.v") === 3);
  ok("every stat gets a type", A.ev("S.stats.every(s => !!s.type)"));
  ok("old measure became float", A.ev("statByKey('VERT').type") === "float");
  ok("old time kept lower-is-better", A.ev("betterOf(statByKey('LANE'))") === "lower");
  ok("full court sprints added", A.ev("!!S.stats.find(s=>s.key==='SPRFC') && !!S.stats.find(s=>s.key==='SPRFCB')"));
  ok("3/4 sprint kept because it holds data", A.ev("!!S.stats.find(s=>s.key==='SPR34')"));
  ok("…but switched off", A.ev("statByKey('SPR34').on") === false);
  ok("its recorded time still counts", A.ev("totalsFor(activeSession())['p1'].SPR34[0]") === 3.4);
  ok("old practice count still sums, as it did", A.ev("totalsFor(activeSession())['p1'].REPS") === 12);

  const unused = JSON.parse(JSON.stringify(v2)); unused.sessions[0].events = [];
  ok("unused 3/4 sprint removed", !H(boot(unused)).ev("S.stats.some(s=>s.key==='SPR34')"));

  // the guard: v4 must refuse v4.1 data rather than miscount misses as makes
  const v4html = fs.readFileSync(require("path").join(__dirname, "fixtures", "j17-statbook-v4.html"), "utf8");
  A.ev("save()");  // v4.1 has now written schema-3 data
  const saved = JSON.parse(A.w.localStorage.getItem("j17.statbook.v2"));
  ok("storage now holds schema 3", saved.v === 3);
  const old = H(boot(saved, v4html));
  ok("v4 refuses v4.1 data instead of misreading it", /newer version/.test(old.$("#view").textContent));
  ok("…and leaves it untouched", JSON.parse(old.w.localStorage.getItem("j17.statbook.v2")).v === 3);
}

/* ================= 5. CSV: the parser bugs, and full round trip ================= */
console.log("\n-- csv");
{
  const A = H(boot(gameSeed({
    players: [
      { id: "p1", name: "Park, Riley", desc: 'the "sniper"', aliases: ["Rylee Park", "Rye"], notes: "Line one\nLine two", active: true },
      P("p2", "Dana Ortiz"), P("p3", "Ari Kim")]
  })));
  A.ev("S.stats.push({key:'CHG', label:'Took a charge', short:'CHG', type:'boolean', tally:false, scope:'game', on:true});");
  A.ev("S.stats.push({key:'NOTE', label:'Note', short:'NOTE', type:'text', tally:false, scope:'game', on:true});");
  A.ev("record('3P', undefined, 'p1', {x:0.12, y:0.4});");
  A.ev("record('2P', undefined, 'p1', {x:0.5, y:0.2, miss:true});");
  A.ev("record('CHG', true, 'p2');");
  A.ev("record('NOTE', 'Said \"switch\", then, closed out', 'p3');");
  A.ev("activeSession().finalScore = [0, 12]; activeSession().notes = 'Tough game,\\nshort bench';");

  const files = { stats: A.ev("statsCSV()"), players: A.ev("playersCSV()"), sessions: A.ev("sessionsCSV()"), events: A.ev("eventsCSV()") };
  ok("header detection: stats", A.ev("csvKind(" + JSON.stringify(files.stats) + ")") === "stats");
  ok("header detection: players", A.ev("csvKind(" + JSON.stringify(files.players) + ")") === "players");
  ok("header detection: sessions", A.ev("csvKind(" + JSON.stringify(files.sessions) + ")") === "sessions");
  ok("header detection: events", A.ev("csvKind(" + JSON.stringify(files.events) + ")") === "events");
  ok("header detection: unrelated file", A.ev("csvKind('a,b,c\\n1,2,3')") === null);

  const B = H(boot({ v: 3, prefs: {}, players: [], stats: null, sessions: [], activeId: null }));
  B.ev("importFromCSVs(" + [files.players, files.sessions, files.events, files.stats].map(x => JSON.stringify(x)).join(",") + ")");
  const p1 = B.ev("player('p1')");
  ok("comma in a name survives", p1.name === "Park, Riley", p1.name);
  ok("quotes in a field survive", p1.desc === 'the "sniper"', p1.desc);
  ok("line break in notes survives", p1.notes === "Line one\nLine two", JSON.stringify(p1.notes));
  ok("aliases survive", p1.aliases.join("|") === "Rylee Park|Rye");
  ok("session note with comma + newline survives", B.ev("S.sessions[0].notes") === "Tough game,\nshort bench");
  ok("a score of 0 survives (was blanked in v4)", B.ev("S.sessions[0].finalScore.join()") === "0,12");
  ok("period length survives", B.ev("S.sessions[0].periodMin") === 8);
  ok("custom stats travel in stats.csv", B.ev("statByKey('CHG').type") === "boolean");
  ok("boolean value comes back as a boolean", B.ev("S.sessions[0].events.find(e=>e.key==='CHG').v") === true);
  ok("text value with quotes and commas survives", B.ev("S.sessions[0].events.find(e=>e.key==='NOTE').v") === 'Said "switch", then, closed out');
  ok("shot position survives", B.ev("S.sessions[0].events.find(e=>e.key==='3P').x") === 0.12);
  ok("miss survives", B.ev("S.sessions[0].events.find(e=>e.key==='2P').miss") === true);
  ok("score identical after round trip", B.ev("teamScore(S.sessions[0],0)") === A.ev("teamScore(activeSession(),0)"));
  ok("re-export is byte-identical", B.ev("eventsCSV()") === files.events);

  // Excel habits: CRLF line endings and a byte-order mark
  const excel = "\uFEFF" + files.players.replace(/\n(?=[^"]*(?:"[^"]*"[^"]*)*$)/g, "\r\n");
  const C = H(boot({ v: 3, prefs: {}, players: [], stats: null, sessions: [], activeId: null }));
  C.ev("importPlayersCSV(" + JSON.stringify(excel) + ")");
  ok("CRLF + BOM from Excel import cleanly", C.ev("S.players.length") === 3 && C.ev("S.players[0].id") === "p1", C.ev("S.players.map(p=>p.id).join()"));

  // v4-era files (no stats.csv, fewer columns) still import
  const v4events = "id,session_id,player_id,stat_key,value,period,team,timestamp\ne9,s9,p1,3P,1,Q1,0,5";
  const v4sessions = "id,date,kind,format,title,team1_name,team1_players,team2_name,team2_players,final_score_1,final_score_2,notes\n" +
                     "s9,5,game,quarters,Old,Black,p1,White,p2,40,38,";
  const D = H(boot({ v: 3, prefs: {}, players: [P("p1","Riley Park"), P("p2","J")], stats: null, sessions: [], activeId: null }));
  const r = D.ev("importFromCSVs('', " + JSON.stringify(v4sessions) + ", " + JSON.stringify(v4events) + ")");
  ok("v4-format CSVs still import", r.sessions === 1 && r.events === 1 && D.ev("teamScore(S.sessions[0],0)") === 3);
  ok("missing columns default sensibly", D.ev("S.sessions[0].events[0].miss") === undefined && D.ev("S.sessions[0].done") === false);

  // events whose session isn't there are reported, not silently lost
  const E = H(boot({ v: 3, prefs: {}, players: [], stats: null, sessions: [], activeId: null }));
  const r2 = E.ev("importFromCSVs('', '', " + JSON.stringify(v4events) + ")");
  ok("orphan entries are counted", r2.orphans === 1 && r2.events === 0);

  // importing twice adds nothing
  const r3 = B.ev("importFromCSVs(" + [files.players, files.sessions, files.events, files.stats].map(x => JSON.stringify(x)).join(",") + ")");
  ok("second import is a no-op", r3.players === 0 && r3.sessions === 0 && r3.events === 0 && r3.stats === 0);

  // one picker, multiple files
  ok("import uses one multi-file picker", /inp\.multiple = true/.test(html));
}

console.log(fails ? "\n" + fails + " FAILING" : "\nall green");
process.exit(fails ? 1 : 0);
