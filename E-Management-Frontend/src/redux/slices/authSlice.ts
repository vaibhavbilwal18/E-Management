import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { PublicUser } from "@/types/auth.types";

interface AuthState {
  user: PublicUser | null;
  accessToken: string | null;
  isInitialized: boolean;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isInitialized: false,
};

interface SessionPayload {
  user: PublicUser;
  accessToken: string;
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    sessionChanged(state, action: PayloadAction<SessionPayload | null>) {
      state.user = action.payload?.user ?? null;
      state.accessToken = action.payload?.accessToken ?? null;
      state.isInitialized = true;
    },
  },
});

export const { sessionChanged } = authSlice.actions;
export default authSlice.reducer;
