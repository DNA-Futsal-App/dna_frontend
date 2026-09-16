import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
const script = fileURLToPath(new URL("./auto-match-team-logos.mjs", import.meta.url));

test("matches exact normalized names using category family and preserves ambiguity", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "dna-auto-logo-"));
  const reviewDirectory = path.join(directory, ".team-logo-review");
  await fs.mkdir(reviewDirectory);
  const baseLogo = `/team-logos/${"a".repeat(64)}.webp`;
  const initiationLogo = `/team-logos/${"b".repeat(64)}.webp`;
  await fs.writeFile(path.join(reviewDirectory, "inventory.json"), JSON.stringify([
    { logoPath: baseLogo, sources: ["BASE/A1/juventus.png"] },
    { logoPath: initiationLogo, sources: ["INICIAÇÃO/A1/CA_Juventus_logo.svg.png"] },
  ]));
  await fs.writeFile(path.join(reviewDirectory, "review.json"), JSON.stringify([
    { eventId: 908, teamId: "12295", teamName: "C.A. JUVENTUS", division: "A1",
      category: "Sub-14", approved: false, skipReason: "", clubKey: "", logoPath: "", aliases: [] },
    { eventId: 909, teamId: "12295", teamName: "C.A. JUVENTUS", division: "A1",
      category: "Sub-10", approved: false, skipReason: "", clubKey: "", logoPath: "", aliases: [] },
    { eventId: 910, teamId: "12295", teamName: "C.A. JUVENTUS", division: "A1",
      category: "Especial", approved: false, skipReason: "", clubKey: "", logoPath: "", aliases: [] },
  ]));
  try {
    await run(process.execPath, [script, "--apply"], { cwd: directory });
    const rows = JSON.parse(await fs.readFile(path.join(reviewDirectory, "review.json"), "utf8"));
    assert.equal(rows[0].approved, true);
    assert.equal(rows[0].logoPath, baseLogo);
    assert.equal(rows[0].clubKey, "ca-juventus-base");
    assert.equal(rows[1].approved, true);
    assert.equal(rows[1].logoPath, initiationLogo);
    assert.equal(rows[1].clubKey, "ca-juventus-iniciacao");
    assert.equal(rows[2].approved, false);
    assert.equal(rows[2].skipReason, "");
    await fs.access(path.join(reviewDirectory, "review.json.bak"));
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
