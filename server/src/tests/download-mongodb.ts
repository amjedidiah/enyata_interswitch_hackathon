/**
 * Downloads and caches the MongoDB binary used by mongodb-memory-server.
 * Run once via `bun run test:setup` before `bun run test`.
 * Subsequent test runs use the cached binary and connect instantly.
 */
import { MongoMemoryServer } from "mongodb-memory-server";

console.info("[test:setup] Downloading MongoDB binary if not already cached…");
const server = await MongoMemoryServer.create();
await server.stop();
console.info("[test:setup] Done — binary is cached and ready.");
