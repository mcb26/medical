import { createSlice } from '@reduxjs/toolkit';

const practiceSlice = createSlice({
  name: 'practice',
  initialState: {
    bundesland: null,
    // weitere Eigenschaften hier
  },
  reducers: {
    setBundesland: (state, action) => {
      state.bundesland = action.payload;
    },
    // weitere Reducer hier
  },
});

export const { setBundesland } = practiceSlice.actions;
export default practiceSlice.reducer; 