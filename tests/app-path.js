// Which app build the tests run against:
//   1. $STATBOOK            e.g.  STATBOOK=../v4.6/index.html npm test
//   2. tests/index.html     a copy placed next to the tests
//   3. ../latest/index.html the repo layout: tests/ beside latest/
const fs = require("fs"), path = require("path");
const choices = [process.env.STATBOOK, path.join(__dirname, "index.html"), path.join(__dirname, "..", "latest", "index.html")];
const found = choices.filter(Boolean).find(p => fs.existsSync(p));
if (!found) { console.error("Can't find the app. Set STATBOOK=path/to/index.html"); process.exit(2); }
module.exports = found;
