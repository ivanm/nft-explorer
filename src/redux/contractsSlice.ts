import { createSlice } from "@reduxjs/toolkit";

interface ContractState {
  activeContractAddress: string;
  dataByContract: any;
}

const initialState: ContractState = {
  dataByContract: {},
  activeContractAddress: "0xBd3531dA5CF5857e7CfAA92426877b022e612cf8"
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
