import { configureStore } from "@reduxjs/toolkit";
import contractsReducer from "./contractsSlice";
import optionsReducer from "./optionsSlice";
import { save, load } from "redux-localstorage-simple";

const store = configureStore({
  reducer: {
    contracts: contractsReducer,
    options: optionsReducer
  },
  middleware: [
    save({ states: ["contracts", "options"], namespace: "localdata" })
  ],
  preloadedState: load({
    states: ["contracts", "options"],
    namespace: "localdata"
  })
});

export default store;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
