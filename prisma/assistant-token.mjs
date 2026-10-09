// Makes a fresh Assistant API token. Plain Node, nothing imported but
// node:crypto, and it never writes a file — the token exists only in this
// terminal, once. Run: npm run assistant:token
import { createHash, randomBytes } from "node:crypto";

const token = randomBytes(32).toString("base64url");
const hash = createHash("sha256").update(token).digest("hex");

console.log(`Token (shown once, keep it safe):\n  ${token}\n`);
console.log(`SHA-256 hash:\n  ${hash}\n`);
console.log("1. Put the HASH in Vercel as ASSISTANT_API_TOKEN_HASH (Production).");
console.log("2. Paste the TOKEN into Home Hub's secure input. Never put it in git or chat.");
console.log("3. To rotate, run this again and swap both values; the old token stops working.");
