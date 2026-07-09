import { createSlice } from "@reduxjs/toolkit";

const depertmentSlice = createSlice({
  name: "depertment",
  initialState: {
    depertments: [], // Stores depertment list
  },
  reducers: {
    setDepertments: (state, action) => {
      state.depertments = action.payload; // Set entire hospital list
    },
  },
});

// Export Actions & Reducer
export const { setDepertments } = depertmentSlice.actions;
export default depertmentSlice.reducer;

// Selector Function
export const selectDepertments = (state) => state.depertment.depertments;
