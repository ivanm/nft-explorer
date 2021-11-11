import { ethers } from "ethers";
import { useContractCalls } from "@usedapp/core";
import ERC721 from "../abi/ERC721.json";
// import { contractAddress } from "../constants.js";

const contractInterface = new ethers.utils.Interface(ERC721.abi);

const useTokenURI = (contractAddress: string, indexes: number[]) => {
  const tokenURI: any =
    useContractCalls(
      indexes.map(index => ({
        abi: contractInterface,
        address: contractAddress,
        method: "tokenURI",
        args: [index]
      }))
    ) ?? null;
  return tokenURI;
};
export default useTokenURI;
