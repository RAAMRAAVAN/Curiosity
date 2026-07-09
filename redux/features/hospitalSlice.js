import { createSlice } from "@reduxjs/toolkit";

const hospitalSlice = createSlice({
  name: "hospital",
  initialState: {
    hospitals: [], // Stores hospital list
  },
  reducers: {
    setHospitals: (state, action) => {
      state.hospitals = action.payload; // Set entire hospital list
    },
  },
});

// Export Actions & Reducer
export const { setHospitals } = hospitalSlice.actions;
export default hospitalSlice.reducer;

// Selector Function
export const selectHospitals = (state) => state.hospital.hospitals;
