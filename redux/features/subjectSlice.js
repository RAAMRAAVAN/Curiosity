import { createSlice } from "@reduxjs/toolkit";


const initialState = {
  selectedSubject: null,
};


const subjectSlice = createSlice({

  name: "subject",

  initialState,

  reducers: {

    setSelectedSubject: (state, action) => {
      state.selectedSubject = action.payload;
    },

    clearSelectedSubject: (state) => {
      state.selectedSubject = null;
    },

  },

});


export const {
  setSelectedSubject,
  clearSelectedSubject,
} = subjectSlice.actions;


export default subjectSlice.reducer;


// Selector
export const selectSelectedSubject = (state) =>
  state.subject.selectedSubject;