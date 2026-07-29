import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { buildClassSlug } from "@/lib/classSlug";

// Fetch all classes
export const fetchClasses = createAsyncThunk(
  "classes/fetchClasses",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/classes", {
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch classes");
      }

      return data.data || [];

    } catch (error) {
      return rejectWithValue(
        error.message || "Failed to fetch classes"
      );
    }
  }
);


const initialState = {
  items: [],
  status: "idle",
  error: null,

  // Default selected class
  // Example: Class 1
  defaultClass: "1",
};


const classSlice = createSlice({
  name: "classes",

  initialState,

  reducers: {

    // Change selected/default class
    setDefaultClass: (state, action) => {
      const normalized =
        typeof action.payload === "string"
          ? action.payload
          : action.payload?.className || action.payload?.name || "";

      state.defaultClass = normalized;
    },

  },


  extraReducers: (builder) => {

    builder

      .addCase(fetchClasses.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })


      .addCase(fetchClasses.fulfilled, (state, action) => {

        state.status = "succeeded";

        state.items = action.payload;


        // If default class does not exist,
        // select first available class
        const defaultExists = action.payload.some(
          (item) => item.className === state.defaultClass
        );


        if (!defaultExists && action.payload.length > 0) {
          state.defaultClass = action.payload[0].className;
        }

      })


      .addCase(fetchClasses.rejected, (state, action) => {

        state.status = "failed";

        state.error =
          action.payload || "Failed to fetch classes";

      });

  },

});


// Actions
export const { setDefaultClass } = classSlice.actions;


// Reducer
export default classSlice.reducer;



// ================= Selectors =================


// Get selected class name
// Example: "1"
export const selectDefaultClass = (state) =>
  state.classes.defaultClass;


// Get all classes
export const selectClasses = (state) =>
  state.classes.items;



// Convert class name to database ID
// Example:
// Input: "1"
// Output: "cmrakc7ci0003uhxoxhpbw5rx"

export const getClassByIdentifier = (state, classNameOrIdentifier) => {
  const identifier = String(classNameOrIdentifier ?? "").trim();

  if (!identifier) {
    return null;
  }

  return (
    state.classes.items.find((item) => {
      const className = item.className || item.name || "";
      const slug = item.slug || buildClassSlug(className);

      return (
        className === identifier ||
        slug === identifier ||
        buildClassSlug(className) === buildClassSlug(identifier)
      );
    }) || null
  );
};

export const getClassIdByName = (state, className) => {
  const cls = getClassByIdentifier(state, className);
  return cls ? cls.id : null;
};