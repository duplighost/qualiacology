// One command for the whole gate chain: build, validate, route smoke, and
// (by flag) the art audit and browser QA. Mirrors the npm scripts in
// build/package.json so a local run checks the same things CI does.
//   node build/scripts/preflight.mjs [--art] [--qa]
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const flags = new Set(process.argv.slice(2));
const onWindows = process.platform === "win32";

const steps = [
  { name: "build", cmd: "node", args: ["scripts/build-site.mjs"] },
  { name: "validate", cmd: "node", args: ["scripts/validate-site.mjs", "--root=.."] },
  { name: "route smoke", cmd: "node", args: ["scripts/route-smoke.mjs", "--root=.."] },
];
if (flags.has("--art")) {
  steps.push(onWindows
    ? { name: "art audit", cmd: "py", args: ["-3", "qa/catalog-art.py", "audit"] }
    : { name: "art audit", cmd: "python3", args: ["qa/catalog-art.py", "audit"] });
}
if (flags.has("--qa")) steps.push({ name: "browser qa", cmd: "npm", args: ["run", "qa"] });

for (const step of steps) {
  console.log(`\n== preflight: ${step.name} ==`);
  const result = spawnSync(step.cmd, step.args, { cwd: projectRoot, stdio: "inherit", shell: onWindows && step.cmd !== "node" });
  if (result.status !== 0) {
    console.error(`\npreflight FAILED at: ${step.name}`);
    process.exit(result.status ?? 1);
  }
}
console.log(`\npreflight PASS (${steps.map((step) => step.name).join(", ")})`);
