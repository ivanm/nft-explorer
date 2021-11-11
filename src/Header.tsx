import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Flex,
  Box,
  Button,
  Input,
  Heading,
  Select,
  FormControl,
  FormLabel
} from "@chakra-ui/react";

import { RootState } from "./redux/store";

import { changeActiveContractAddress } from "./redux/contractsSlice";
import {
  initialState as optionsInitialState,
  setCorsProxyUrl,
  setIpfsGateway
} from "./redux/optionsSlice";
import presets from "./presets";
import ipfsGateways from "./ipsGateways";

const Header = () => {
  const activeContractAddress = useSelector(
    ({ contracts: { activeContractAddress } }: RootState) =>
      activeContractAddress
  );
  const corsProxyUrl = useSelector(
    ({ options: { corsProxyUrl } }: RootState) => corsProxyUrl
  );
  const ipfsGateway = useSelector(
    ({ options: { ipfsGateway } }: RootState) => ipfsGateway
  );
  const dispatch = useDispatch();
  const [formContractAddress, setFormContractAddress] = useState<string>(
    activeContractAddress
  );
  const [formIpfsGatewayUrl, serFormIpfsGatewayUrl] = useState<string>(
    ipfsGateway
  );
  const [firstFormIpfsGatewayUrl, setFirstFormIpfsGatewayUrl] = useState<
    string
  >(ipfsGateway);
  const [preset, setPreset] = useState(
    presets.find(({ address }) => address === activeContractAddress)
      ? presets.find(({ address }) => address === activeContractAddress).address
      : ""
  );
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const [formCorsProxyUrl, setFormCorsProxyUrl] = useState<string>(
    corsProxyUrl == null ? "" : corsProxyUrl
  );
  const [firstFormCorsProxyUrl, setFirstFormCorsProxyUrl] = useState<
    string | null
  >(corsProxyUrl == null ? "" : corsProxyUrl);

  return (
    <Box
      id="header"
      as="header"
      display="flex"
      flexDirection="column"
      width="100%"
      p={0}
      alignItems="center"
    >
      <Flex borderRadius="20px" bg="gray.600" p={4} m={5} justify="center">
        <Flex width="800px" direction="column">
          <Heading textAlign="center" as="h1">
            NFT Explorer
          </Heading>
          <Box textAlign="center">
            Enter any Contract Address of an NFT Collection or select any of the
            available presets
          </Box>
          <Flex justify="space-around" align="center" height="100%">
            <Select
              width="250px"
              onChange={({ target: { value } }) => {
                setPreset(value);
                if (value) {
                  setFormContractAddress(value);
                  dispatch(changeActiveContractAddress(value));
                }
              }}
              value={preset}
            >
              {presets.map(({ name, address }) => (
                <option key={address} value={address}>
                  {name}
                </option>
              ))}
              <option key="other" value="">
                Other
              </option>
            </Select>
            <Input
              ml="5px"
              minWidth="420px"
              placeholder="Address"
              value={formContractAddress}
              onChange={({ target: { value } }) => {
                setFormContractAddress(value);
              }}
            />
            <Button
              ml="5px"
              onClick={() => {
                dispatch(changeActiveContractAddress(formContractAddress));

                setPreset(
                  presets.find(({ address }) => address === formContractAddress)
                    ? presets.find(
                        ({ address }) => address === formContractAddress
                      ).address
                    : ""
                );
              }}
            >
              Go
            </Button>
            <Button
              ml="5px"
              onClick={() => {
                setShowOptions(!showOptions);
              }}
            >
              Options
            </Button>
          </Flex>
          {showOptions ? (
            <Flex
              direction="column"
              m={4}
              p={4}
              borderWidth="2px"
              borderRadius="12px"
            >
              <Flex direction="column">
                <FormControl id="corsProxy">
                  <FormLabel>CORS Proxy</FormLabel>
                  <Input
                    ml="5px"
                    minWidth="420px"
                    placeholder=""
                    value={formCorsProxyUrl}
                    onChange={({ target: { value } }) => {
                      setFormCorsProxyUrl(value);
                    }}
                  />
                </FormControl>
                <FormControl id="ipfsGateway" mt={3}>
                  <FormLabel>IPFS Gateway</FormLabel>
                  <Select
                    value={formIpfsGatewayUrl}
                    onChange={({ target: { value } }) => {
                      serFormIpfsGatewayUrl(value);
                    }}
                  >
                    {ipfsGateways.map(({ name }) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              </Flex>
              <Flex mt={3} justify="end">
                <Button
                  onClick={() => {
                    dispatch(setCorsProxyUrl(formCorsProxyUrl));
                    dispatch(setIpfsGateway(formIpfsGatewayUrl));
                    setShowOptions(false);
                    setFirstFormIpfsGatewayUrl(formIpfsGatewayUrl);
                    setFirstFormCorsProxyUrl(formCorsProxyUrl);
                  }}
                  isDisabled={
                    firstFormCorsProxyUrl === formCorsProxyUrl &&
                    firstFormIpfsGatewayUrl === formIpfsGatewayUrl
                  }
                >
                  Update
                </Button>
                <Button
                  ml={2}
                  isDisabled={
                    optionsInitialState.corsProxyUrl === formCorsProxyUrl &&
                    optionsInitialState.ipfsGateway === formIpfsGatewayUrl
                  }
                  onClick={() => {
                    setFormCorsProxyUrl(
                      optionsInitialState.corsProxyUrl == null
                        ? ""
                        : optionsInitialState.corsProxyUrl
                    );
                    serFormIpfsGatewayUrl(optionsInitialState.ipfsGateway);
                    dispatch(setCorsProxyUrl(optionsInitialState.corsProxyUrl));
                    dispatch(setIpfsGateway(optionsInitialState.ipfsGateway));
                    setShowOptions(false);
                    setFirstFormIpfsGatewayUrl(optionsInitialState.ipfsGateway);
                    setFirstFormCorsProxyUrl(optionsInitialState.corsProxyUrl);
                  }}
                >
                  Reset
                </Button>
              </Flex>
            </Flex>
          ) : null}
        </Flex>
      </Flex>
    </Box>
  );
};
export default Header;
