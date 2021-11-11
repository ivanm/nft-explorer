import { ethers } from "ethers";
import { useContractCalls } from "@usedapp/core";
import ERC721 from "../abi/ERC721.json";
// import { contractAddress } from "../constants.js";

const contractInterface = new ethers.utils.Interface(ERC721.abi);

const useOwnerOf = (contractAddress: string, tokenIds: number[]) => {
  const ownerOf: any =
    useContractCalls(
      tokenIds.map(tokenId => ({
        abi: contractInterface,
        address: contractAddress,
        method: "ownerOf",
        args: [tokenId]
      }))
    ) ?? [];
  return ownerOf;
};
export default useOwnerOf;
