import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: null,
  loggedIn: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuthUser: (state, action) => {
      state.user = action.payload;
      state.loggedIn = true;
    },
    clearAuthUser: (state) => {
      state.user = null;
      state.loggedIn = false;
    },
  },
});

export const { setAuthUser, clearAuthUser } = authSlice.actions;
export const selectAuthUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.loggedIn;

export default authSlice.reducer;
