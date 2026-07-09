import { createSlice } from "@reduxjs/toolkit";

const newsSlice = createSlice({
  name: "news",
  initialState: {
    newses: [], // Stores hospital list
    available: false,
    selectedID: null
  },
  reducers: {
    setNewses: (state, action) => {
      state.newses = action.payload; // Set entire hospital list
      state.available = true;
    },
    setAvailability: (state, action) => {
      state.available = true;
    },
    setID: (state, action) => {
      state.selectedID = action.payload;
    }
  },
});

// Export Actions & Reducer
export const { setNewses, setAvailability, setID} = newsSlice.actions;
export default newsSlice.reducer;

// Selector Function
export const selectNewses = (state) => state.news.newses;
export const selectNewseID = (state) => state.news.selectedID;
export const selectNewsAvailability = (state) => state.news.available;
export const selectNewsById = () => (state) =>
  state.news.newses.find((news) => news.id == state.news.selectedID);