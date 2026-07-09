import { createSlice } from "@reduxjs/toolkit";

const facilitiesSlice = createSlice({
  name: "facilities",
  initialState: {
    facilities: [], // Stores hospital list
  },
  reducers: {
    setFacilities: (state, action) => {
      state.facilities = action.payload; // Set entire hospital list
    },
  },
});

// Export Actions & Reducer
export const { setFacilities } = facilitiesSlice.actions;
export default facilitiesSlice.reducer;

// Selector Function
export const selectFacilities = (state) => state.facility.facilities;
