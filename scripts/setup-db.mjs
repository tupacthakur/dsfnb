#!/usr/bin/env node
/**
 * Run Prisma generate, migrate, and seed. Requires DATABASE_URL in .env and a running PostgreSQL.
 * Usage: node scripts/setup-db.mjs   or   npm run db:setup (if added to package.json)
 */

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function run(name, cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const c = spawn(cmd, args, {
      cwd: root,
      stdio: "inherit",
      shell: true,
      ...opts,
    });
    c.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${name} exited ${code}`))));
  });
}

async function main() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) {
    console.error("No .env file. Copy .env.example to .env and set DATABASE_URL.");
    process.exit(1);
  }

  console.log("1/3 Prisma generate…");
  await run("prisma generate", "npx", ["prisma", "generate"]);

  console.log("2/3 Prisma migrate…");
  try {
    await run("prisma migrate", "npx", ["prisma", "migrate", "dev", "--name", "init"]);
  } catch (e) {
    console.error("\nMigrate failed. Is PostgreSQL running and DATABASE_URL correct in .env?");
    console.error("  Docker: docker run -d --name dsfnb-pg -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=dsfnb -p 5432:5432 postgres:16-alpine");
    process.exit(1);
  }

  console.log("3/3 Prisma seed…");
  try {
    await run("prisma seed", "npm", ["run", "db:seed"]);
  } catch (e) {
    console.error("\nSeed failed.");
    process.exit(1);
  }

  console.log("\nDB setup done. Start the app with: npm run dev");
}

main();
