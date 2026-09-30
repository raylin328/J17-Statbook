const { JSDOM } = require("jsdom"); const fs = require("fs");
const html = fs.readFileSync(require("./app-path"), "utf8");
let fails = 0;
function ok(l, c) { if (!c) { fails++; console.log("FAIL  " + l); } else console.log("pass  " + l); }
const boot = s => new JSDOM(html, {
  runScripts: "dangerously", url: "https://x.test/",
  beforeParse(w) { if (s) w.localStorage.setItem("j17.statbook.v2", JSON.stringify(s)); }
}).window;

console.log("-- v4.4");
const w = boot({ v: 3, prefs: {}, players: [], stats: null, sessions: [], activeId: null });
ok("Excel detection", w.eval("detectExcel(new Uint8Array([0x50, 0x4B, 0x03, 0x04]))"));
// start a practice so the session dock (with + Player) is on screen
w.eval("S.players = [{ id:'p1', name:'Ari Kim', num:'', active:true, cat:MISC_ID, aliases:[], desc:'', notes:'' }];" +
       "startSession({ kind:'practice', title:'T', playerIds:['p1'] }); render();");
ok("Add player button visible", Array.from(w.document.querySelectorAll("button"))
  .some(b => b.textContent.replace(/\s+/g, " ").trim() === "+ Player"));
ok("gameControls has Undo", html.includes("Undo last"));
ok("practice shows + Player always", html.includes("+ Player") && html.includes("+ Stat"));
console.log(fails ? "\n" + fails + " FAILING" : "\nall green");
process.exit(fails ? 1 : 0);
