const fs = require("node:fs");
const path = require("node:path");
function nextVersion(current, kind) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
  if (!match || !["patch", "minor", "major"].includes(kind))
    throw Error("Use patch, minor or major with a stable semantic version.");
  const [a, b, c] = match.slice(1).map(Number);
  return kind === "major"
    ? `${a + 1}.0.0`
    : kind === "minor"
      ? `${a}.${b + 1}.0`
      : `${a}.${b}.${c + 1}`;
}
module.exports = { nextVersion };
if (require.main === module) {
  const dir = path.resolve(__dirname, "../apps/mobile"),
    file = path.join(dir, "package.json"),
    lockFile = path.join(dir, "package-lock.json"),
    notesFile = path.join(dir, "releases.json");
  const pkg = JSON.parse(fs.readFileSync(file, "utf8")),
    next = nextVersion(pkg.version, process.argv[2]);
  if (process.argv.includes("--dry-run")) {
    console.log(`${pkg.version} -> ${next}`);
    process.exit(0);
  }
  const lock = JSON.parse(fs.readFileSync(lockFile, "utf8")),
    notes = JSON.parse(fs.readFileSync(notesFile, "utf8"));
  pkg.version = next;
  lock.version = next;
  lock.packages[""].version = next;
  notes.unshift({ version: next, status: "development", changes: [] });
  for (const [target, data] of [
    [file, pkg],
    [lockFile, lock],
    [notesFile, notes],
  ])
    fs.writeFileSync(target, JSON.stringify(data, null, 2) + "\n");
  console.log(
    `Mobile version ${next}. Commit source and use tag mobile-v${next} when releasing. EAS increments the native build number independently.`,
  );
}
