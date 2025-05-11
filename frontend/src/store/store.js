import { configureStore } from '@reduxjs/toolkit';
import practiceReducer from './practiceSlice'; // Du musst diesen Slice noch erstellen

const store = configureStore({
  reducer: {
    practice: practiceReducer,
    // weitere Reducer hier hinzufügen
  },
});

export default store; 