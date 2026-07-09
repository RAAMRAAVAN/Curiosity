import { createSlice } from "@reduxjs/toolkit";

const doctorSlice = createSlice({
  name: "doctor",
  initialState: {
    doctors: [], // Stores hospital list
    available: false,
    doctorID: null,
    page: 1
  },
  reducers: {
    setDoctors: (state, action) => {
      state.doctors = action.payload; // Set entire hospital list
      state.available = true;
    },
    setAvailability: (state, action) => {
      state.available = true;
    },
    setDoctorID: (state, action) => {
      state.doctorID = action.payload;
    },
    setPage: (state, action) => {
      state.page = action.payload;
    }
  },
});

// Export Actions & Reducer
export const { setDoctors, setAvailability, setDoctorID, setPage } = doctorSlice.actions;
export default doctorSlice.reducer;

// Selector Function
export const selectDoctors = (state) => state.doctor.doctors;
export const selectPage = (state) => state.doctor.page;
export const selectDoctorID = (state) => state.doctor.doctorID;
export const selectDoctorsAvailability = (state) => state.doctor.available;
export const selectDoctorById = (id) => (state) =>
  state.doctor.doctors.find((doctor) => doctor.id == state.doctor.doctorID);