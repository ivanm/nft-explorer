import { ethers } from "ethers";
import { useContractCall } from "@usedapp/core";
import ERC721 from "../abi/ERC721.json";
// import { contractAddress } from "../constants.js";

const contractInterface = new ethers.utils.Interface(ERC721.abi);

const useBalanceOf = (
  contractAddress: string,
  address: string | undefined | null
) => {
  const [balanceOf]: any =
    useContractCall(
      address
        ? {
            abi: contractInterface,
            address: contractAddress,
            method: "balanceOf",
            args: [address]
          }
        : undefined
    ) ?? [];
  return balanceOf;
};
export default useBalanceOf;
