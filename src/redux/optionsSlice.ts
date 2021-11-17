import { createSlice } from "@reduxjs/toolkit";
import { proxyUrl } from "../constants";

interface OptionState {
  corsProxyUrl: string | null;
  ipfsGateway: string;
  itemSize: number;
}

export const initialState: OptionState = {
  corsProxyUrl: proxyUrl,
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
