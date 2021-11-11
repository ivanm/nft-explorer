import { ethers } from "ethers";
import { useContractCalls } from "@usedapp/core";
import ERC721 from "../abi/ERC721.json";

const contractInterface = new ethers.utils.Interface(ERC721.abi);

const useTokenByIndex = (contractAddress: string, indexes: number[]) => {
  const tokenByIndex: any =
    useContractCalls(
      indexes.map(index => ({
        abi: contractInterface,
        address: contractAddress,
        method: "tokenByIndex",
        args: [index]
      }))
    ) ?? null;
  return tokenByIndex;
};
export default useTokenByIndex;
