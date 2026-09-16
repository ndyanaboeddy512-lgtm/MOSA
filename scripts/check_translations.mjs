import fs from "fs";
import path from "path";

// Dynamically import TS files using TSX or parse AST
async function run() {
  const enText = fs.readFileSync("./src/lib/translations/en.ts", "utf8");
  const rwText = fs.readFileSync("./src/lib/translations/rw.ts", "utf8");
  const frText = fs.readFileSync("./src/lib/translations/fr.ts", "utf8");
  const swText = fs.readFileSync("./src/lib/translations/sw.ts", "utf8");

  function getKeys(text) {
    const lines = text.split("\n");
    const paths = [];
    const stack = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.endsWith("{") || trimmed.includes(": {")) {
        const match = trimmed.match(/^([a-zA-Z0-9_]+)\s*:\s*\{/);
        if (match) {
          stack.push(match[1]);
        }
      } else if (trimmed.startsWith("}") || trimmed.startsWith("},")) {
        stack.pop();
      } else {
        const match = trimmed.match(/^([a-zA-Z0-9_]+)\s*:\s*/);
        if (match) {
          paths.push([...stack, match[1]].join("."));
        }
      }
    }
    return paths;
  }

  const enKeys = getKeys(enText);
  const rwKeys = new Set(getKeys(rwText));
  const frKeys = new Set(getKeys(frText));
  const swKeys = new Set(getKeys(swText));

  console.log("EN total keys:", enKeys.length);
  const missingRw = enKeys.filter(k => !rwKeys.has(k));
  const missingFr = enKeys.filter(k => !frKeys.has(k));
  const missingSw = enKeys.filter(k => !swKeys.has(k));

  console.log("Missing in RW (" + missingRw.length + "):", missingRw);
  console.log("Missing in FR (" + missingFr.length + "):", missingFr);
  console.log("Missing in SW (" + missingSw.length + "):", missingSw);
}

run();
