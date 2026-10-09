const { readFileSync, writeFileSync } = require("node:fs");
const { spawn } = require("node:child_process");
const { MongoClient } = require("mongodb");
require("@next/env").loadEnvConfig(process.cwd());
const config = JSON.parse(readFileSync("test-results/dashboard/environment.json", "utf8"));
const suites = process.argv.slice(2).length ? process.argv.slice(2) : ["backend.integration.cjs", "operations.integration.cjs", "shop-workflows.integration.cjs", "dashboards.integration.cjs", "shop-workflows.browser.cjs", "dashboards.browser.cjs"];
async function main() {
  if (!/^dazzle_dashboard_test_\d+$/.test(config.database) || config.database === (process.env.MONGODB_DB || "dazzle_store")) throw new Error("Refusing an unsafe test database.");
  const client = new MongoClient(process.env.MONGODB_URI); await client.connect();
  try {
    for (const suite of suites) {
      if (!/^[a-z-]+\.(?:integration|browser)\.cjs$/.test(suite)) throw new Error("Invalid test filename.");
      await client.db(config.database).collection("rateLimits").deleteMany({});
      console.log(`Running ${suite} against the isolated test database.`);
      let log = "";
      const code = await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [`tests/${suite}`], { env: { ...process.env, MONGODB_DB: config.database, TEST_BASE_URL: config.base, APP_ORIGIN: config.base } });
        child.stdout.on("data", chunk => { log += chunk; process.stdout.write(chunk); });
        child.stderr.on("data", chunk => { log += chunk; process.stderr.write(chunk); });
        child.on("error", reject); child.on("close", resolve);
      });
      writeFileSync(`test-results/dashboard/${suite}.log`, log);
      if (code !== 0) throw new Error(`${suite} failed; see its saved log.`);
    }
  } finally { await client.close(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
