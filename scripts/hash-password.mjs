/**
 * Usage: npm run hash-password -- "the password"
 * Prints the value for ADMIN_PASSWORD_HASH. The password is never stored.
 */
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";

const password = process.argv[2];
if (!password) {
  console.error('Usage: npm run hash-password -- "your password"');
  process.exit(1);
}
const salt = randomBytes(16);
const key = await promisify(scrypt)(password, salt, 64);
console.log(`scrypt$${salt.toString("hex")}$${key.toString("hex")}`);
