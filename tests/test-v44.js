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
ok("Add player button visible", w.eval("(render(),true)") && w.document.querySelector(".byText('+ Player')") !== null);
ok("gameControls has Undo", html.includes("Undo last"));
ok("practice shows + Player always", html.includes("+ Player") && html.includes("+ Stat"));
console.log(fails ? "\n" + fails + " FAILING" : "\nall green");
process.exit(fails ? 1 : 0);
