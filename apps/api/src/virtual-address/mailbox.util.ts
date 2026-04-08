// Generates a stable, human-friendly virtual mailbox number such as
// "WBK-4F2A". Charset excludes ambiguous chars (0/O, 1/I) for printability.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateMailboxNo(length = 4): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `WBK-${out}`;
}
