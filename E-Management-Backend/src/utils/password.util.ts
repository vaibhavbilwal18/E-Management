import crypto from "crypto";

// Excludes visually ambiguous characters (I, O, l, 0, 1).
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
const SPECIAL = "!@#$%^&*";
const ALL = UPPER + LOWER + DIGITS + SPECIAL;

function randomChar(charset: string): string {
  return charset[crypto.randomInt(charset.length)];
}

/** Generates a temp password that always satisfies the password policy. */
export function generateTempPassword(length = 12): string {
  const required = [randomChar(UPPER), randomChar(LOWER), randomChar(DIGITS), randomChar(SPECIAL)];
  const rest = Array.from({ length: length - required.length }, () => randomChar(ALL));
  const chars = [...required, ...rest];

  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}
