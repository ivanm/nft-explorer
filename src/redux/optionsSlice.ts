import { createSlice } from "@reduxjs/toolkit";

interface OptionState {
  corsProxyUrl: string | null;
  ipfsGateway: string;
  itemSize: number;
}

export const initialState: OptionState = {
  corsProxyUrl:
    "https://e6bp05g0dh.execute-api.us-east-1.amazonaws.com/dev?url=",
  ipfsGateway: "infura-ipfs.io",
  itemSize: 200
};

export const optionsSlice = createSlice({
  name: "options",
  initialState,
  reducers: {
    setCorsProxyUrl: (state, action) => {
      state.corsProxyUrl = action.payload;
    },
    setIpfsGateway: (state, action) => {
      state.ipfsGateway = action.payload;
    },
    setItemSize: (state, action) => {
      state.itemSize = action.payload;
    }
  }
});

export const {
  setCorsProxyUrl,
  setIpfsGateway,
  setItemSize
} = optionsSlice.actions;

export default optionsSlice.reducer;
