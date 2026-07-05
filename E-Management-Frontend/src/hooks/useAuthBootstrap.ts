import { useEffect } from "react";
import { useAppSelector } from "./useAppDispatch";
import { refreshSession } from "@/services/refreshSession";

/** Attempts a silent login via the refresh cookie once on app load. */
export function useAuthBootstrap(): boolean {
  const isInitialized = useAppSelector((state) => state.auth.isInitialized);

  useEffect(() => {
    if (!isInitialized) {
      refreshSession();
    }
    // Runs once on mount — bootstrapping the session is not a reactive effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return isInitialized;
}
