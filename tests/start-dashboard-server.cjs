const { readFileSync } = require("node:fs");
const { spawn } = require("node:child_process");
require("@next/env").loadEnvConfig(process.cwd());
const config = JSON.parse(readFileSync("test-results/dashboard/environment.json", "utf8"));
if (!/^dazzle_dashboard_test_\d+$/.test(config.database) || config.database === (process.env.MONGODB_DB || "dazzle_store")) throw new Error("Refusing to use the application database for tests.");
const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "--port", "3100"], { env: { ...process.env, MONGODB_DB: config.database, APP_ORIGIN: config.base }, stdio: "inherit" });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", code => { process.exitCode = code || 0; });
