import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const { runTransform } = await import("../lib/etl/transform");
  const transformed = await runTransform();
  console.log("Transform result:", transformed);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
