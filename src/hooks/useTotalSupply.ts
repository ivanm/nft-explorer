import { ethers } from "ethers";
import { useContractCall } from "@usedapp/core";
import ERC721 from "../abi/ERC721.json";
// import { contractAddress } from "../constants.js";

const contractInterface = new ethers.utils.Interface(ERC721.abi);

const useTotalSupply = (contractAddress: string) => {
  const [totalSupply]: any =
    useContractCall({
      abi: contractInterface,
      address: contractAddress,
      method: "totalSupply",
      args: []
    }) ?? [];
  return totalSupply;
};
export default useTotalSupply;
