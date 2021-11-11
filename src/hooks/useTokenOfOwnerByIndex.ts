import { ethers } from "ethers";
import { useContractCalls } from "@usedapp/core";
import ERC721 from "../abi/ERC721.json";
// import { contractAddress } from "../constants.js";

const contractInterface = new ethers.utils.Interface(ERC721.abi);

const useTokenOfOwnerByIndex = (
  contractAddress: string,
  address: string | undefined | null,
  indexes: number[]
) => {
  const tokenOfOwnerByIndex: any =
    useContractCalls(
      indexes.map(index => ({
        abi: contractInterface,
        address: contractAddress,
        method: "tokenOfOwnerByIndex",
        args: [address, index]
      }))
    ) ?? null;
  return tokenOfOwnerByIndex;
};
export default useTokenOfOwnerByIndex;
