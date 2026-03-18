import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const { initDatabase } = await import("../lib/db/init");
  const result = await initDatabase();
  console.log(`Database init mode: ${result.mode}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
