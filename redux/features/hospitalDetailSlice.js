import { createSlice } from "@reduxjs/toolkit";

const hospitalDetailSlice = createSlice({
  name: "hospital_details",
  initialState: {
    hospital_details: [], // Stores hospital list
  },
  reducers: {
    setHospitalDetails: (state, action) => {
      
      state.hospital_details= action.payload; // Set entire hospital list
    },
  },
});

// Export Actions & Reducer
export const { setHospitalDetails } = hospitalDetailSlice.actions;
export default hospitalDetailSlice.reducer;

// Selector Function
export const selectHospitalDetails = (state) => state.hospital_details.hospital_details;
