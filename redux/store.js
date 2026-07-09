import { configureStore } from '@reduxjs/toolkit';
import hospital_detailsReducer from './features/hospitalDetailSlice';
import hospitalReducer from './features/hospitalSlice';
import facilitiesReducer from './features/facilitiesSlice';
import doctorReducer from './features/doctorSlice';
import newsReducer from './features/newsSlice';
import depertmentReducer from './features/depertmentSlice';
import authReducer from './features/authSlice';
import classReducer from './features/classSlice';

export const store = configureStore({
  reducer: {
    hospital: hospitalReducer,
    hospital_details: hospital_detailsReducer,
    facility: facilitiesReducer,
    doctor: doctorReducer,
    news: newsReducer,
    depertment: depertmentReducer,
    auth: authReducer,
    classes: classReducer,
  },
});
