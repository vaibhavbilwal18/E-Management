import bcrypt from "bcrypt";
import { BCRYPT_SALT_ROUNDS } from "../constants/auth.constants";

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
