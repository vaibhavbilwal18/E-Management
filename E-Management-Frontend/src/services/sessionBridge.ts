import type { PublicUser } from "@/types/auth.types";

export interface Session {
  user: PublicUser;
  accessToken: string;
}

type SessionListener = (session: Session | null) => void;

let currentAccessToken: string | null = null;
let listener: SessionListener | null = null;

/**
 * Read synchronously from the axios interceptor — kept outside Redux so the
 * interceptor never has to import the store (which would create a
 * store -> baseApi -> axios -> store import cycle).
 */
export function getAccessToken(): string | null {
  return currentAccessToken;
}

export function setSession(session: Session | null): void {
  currentAccessToken = session?.accessToken ?? null;
  listener?.(session);
}

export function registerSessionListener(fn: SessionListener): void {
  listener = fn;
}
