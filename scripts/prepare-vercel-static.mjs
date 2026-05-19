import { copyFileSync, renameSync } from "node:fs";
import { join } from "node:path";

const outDir = join(process.cwd(), "out");

// Vercel serves index.html at /. Keep the desktop shell out of the public site.
renameSync(join(outDir, "index.html"), join(outDir, "desktop.html"));
copyFileSync(join(outDir, "landing.html"), join(outDir, "index.html"));
