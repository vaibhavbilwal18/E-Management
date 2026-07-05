import axios from "axios";
import { setSession } from "./sessionBridge";
import type { ApiEnvelope } from "@/types/api.types";
import type { AuthSessionResponse } from "@/types/auth.types";

const baseURL = import.meta.env.VITE_API_BASE_URL;

let inFlight: Promise<AuthSessionResponse | null> | null = null;

/**
 * The single entry point for POST /auth/refresh. Both the axios 401
 * interceptor and the app-boot silent-login hook call this — sharing one
 * in-flight promise so concurrent callers never send two refresh requests
 * for the same rotating token. Two concurrent calls would otherwise race:
 * the first rotates the token and revokes the old one, so the second
 * arrives holding an already-revoked token and trips the reuse-detection
 * path, which revokes the whole session it just legitimately established.
 */
export function refreshSession(): Promise<AuthSessionResponse | null> {
  inFlight ??= performRefresh().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function performRefresh(): Promise<AuthSessionResponse | null> {
  try {
    const response = await axios.post<ApiEnvelope<AuthSessionResponse>>(
      `${baseURL}/auth/refresh`,
      {},
      {
        withCredentials: true,
        withXSRFToken: true,
        xsrfCookieName: "XSRF-TOKEN",
        xsrfHeaderName: "x-xsrf-token",
      },
    );
    setSession(response.data.data);
    return response.data.data;
  } catch {
    setSession(null);
    return null;
  }
}
