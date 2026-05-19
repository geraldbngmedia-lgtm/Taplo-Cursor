import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const releaseDir = join(root, process.env.TAPLO_RELEASE_DIR ?? "release-build");
const downloadsDir = join(root, "public", "downloads");

const patterns = [
  { match: /\.dmg$/i, dest: "Taplo-mac.dmg" },
  { match: /\.exe$/i, dest: "Taplo-win.exe" },
];

if (!existsSync(releaseDir)) {
  console.error(`No ${releaseDir} folder found. Run npm run package first.`);
  process.exit(1);
}

mkdirSync(downloadsDir, { recursive: true });

const files = readdirSync(releaseDir, { withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name);

let copied = 0;

for (const { match, dest } of patterns) {
  const source = files.find((name) => match.test(name));
  if (!source) {
    console.warn(`Skipping ${dest}: no matching artifact in release/`);
    continue;
  }

  copyFileSync(join(releaseDir, source), join(downloadsDir, dest));
  console.log(`Copied ${source} -> public/downloads/${dest}`);
  copied += 1;
}

if (copied === 0) {
  console.error("No installers copied. Check electron-builder output in release/.");
  process.exit(1);
}
