import { createSlice } from "@reduxjs/toolkit";
import presets from "../presets";

interface ContractState {
  activeContractAddress: string;
  dataByContract: any;
}

const initialState: ContractState = {
  dataByContract: {},
  // Start with a random address from presets
  activeContractAddress: Object.values(presets)[
    Math.floor(Math.random() * Object.values(presets).length)
  ].address
};

export const contractsSlice = createSlice({
  name: "contracts",
  initialState,
  reducers: {
    init: (state, action) => {
      if (!state.dataByContract[action.payload.contractAddress]) {
        let contractMap: { [index: number]: any } = {};
        for (
          let i = action.payload.initialValue;
          i < action.payload.totalSupply + action.payload.initialValue;
          i++
        ) {
          contractMap[i] = {};
        }
        state.dataByContract[action.payload.contractAddress] = contractMap;
      }
    },
    setMetadataURI: (state, action) => {
      action.payload.tokens.forEach(({ tokenId, uri }: any) => {
        state.dataByContract[action.payload.contractAddress][tokenId].uri = uri;
      });
    },
    setMetadataJSON: (state, action) => {
      action.payload.tokens.forEach(({ tokenId, json }: any) => {
        state.dataByContract[action.payload.contractAddress][tokenId].json = {
          image: json.image,
          name: json.name
        };
      });
    },
    changeActiveContractAddress: (state, action) => {
      state.activeContractAddress = action.payload;
    }
  }
});

export const {
  setMetadataURI,
  setMetadataJSON,
  changeActiveContractAddress,
  init
} = contractsSlice.actions;

export default contractsSlice.reducer;
