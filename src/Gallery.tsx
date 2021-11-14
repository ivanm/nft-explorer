import { Fragment, useEffect, useState, useRef, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { FixedSizeList as List } from "react-window";
import { ReactWindowScroller } from "./ReactWindowScroller";
// import { RouteComponentProps } from "@reach/router";
import { useEthers } from "@usedapp/core";
import { Flex, Box, Text, Spinner, Link, Image } from "@chakra-ui/react";
import debounce from "debounce";

import { init, setMetadataURI, setMetadataJSON } from "./redux/contractsSlice";
import { setItemSize } from "./redux/optionsSlice";
import { RootState } from "./redux/store";

import useTotalSupply from "./hooks/useTotalSupply";
import useTokenURI from "./hooks/useTokenURI";
import useTokenByIndex from "./hooks/useTokenByIndex";
import usePrevious from "./hooks/usePrevious";
import useForceUpdate from "./hooks/useForceUpdate";

import { configChainId } from "./constants";

import GalleryModal from "./GalleryModal";

import ipfsGatewayUrl from "./helpers/ipfsGatewayUrl";
import sleep from "./helpers/sleep";

const Gallery = ({ listRef }) => {
  // Common hooks
  const forceUpdate = useForceUpdate();

  // useDapp hooks
  const { chainId } = useEthers();

  // Redux
  const dispatch = useDispatch();
  const dataByContract = useSelector(
    ({ contracts: { dataByContract } }: RootState) => dataByContract
  );
  const activeContractAddress = useSelector(
    ({ contracts: { activeContractAddress } }: RootState) =>
      activeContractAddress
  );
  const missingUriByContract = useSelector(
    ({ contracts: { missingUriByContract } }: RootState) => missingUriByContract
  );
  const corsProxyUrl = useSelector(
    ({ options: { corsProxyUrl } }: RootState) => corsProxyUrl
  );
  const ipfsGateway = useSelector(
    ({ options: { ipfsGateway } }: RootState) => ipfsGateway
  );
  const itemSize = useSelector(
    ({ options: { itemSize } }: RootState) => itemSize
  );

  // Calculated
  const containerWidth = window.innerWidth * 0.9;
  const wrongNetWork = chainId !== configChainId;
  // Flag that indicates all URIs of the gallery have been obtained
  const loadedUris =
    missingUriByContract[activeContractAddress] &&
    missingUriByContract[activeContractAddress].length === 0;
  // States
  // State of the modal, stores the tokenId to show or null if hidden
  const [tokenModal, setTokenModal] = useState<number | null>(null);
  // Stores Window sizes, it rerenders page with each resize
  const [, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  // Stores the tokens with pending URIs
  const [pendingUriTokens, setPendingUriTokens] = useState<number[]>([]);

  // References
  // Map of the Promises of the token images to be loaded after delay
  const delayedImagesMap: any = useRef({});
  // Map of the Promises of the tokens json to be loaded after delay
  const delayedJsonMap: any = useRef({});
  // Map of the images of the tokens already loaded
  const imagesLoadedMap: any = useRef({});

  // Contract hooks
  const totalSupply = useTotalSupply(activeContractAddress);
  const [initialToken] = useTokenByIndex(activeContractAddress, [0]);
  const tokenURIs = useTokenURI(activeContractAddress, pendingUriTokens);

  // Updates the state  with the window values
  const resize = useCallback(() => {
    if (window.innerWidth < 500) {
      dispatch(setItemSize(100));
    } else {
      dispatch(setItemSize(200));
    }
    setWindowSize({
      height: window.innerHeight,
      width: window.innerWidth
    });
  }, [dispatch]);

  // Effect to recalculate size
  useEffect(() => {
    resize();
    window.addEventListener("resize", () => {
      resize();
    });

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, [resize]);

  // Effect to initialize store with the contract token skeleton data
  const initialValue = initialToken ? initialToken[0] : null;
  useEffect(() => {
    if (initialValue && totalSupply && !dataByContract[activeContractAddress]) {
      dispatch(
        init({
          totalSupply: totalSupply.toNumber(),
          contractAddress: activeContractAddress,
          initialValue: initialValue.toNumber()
        })
      );
    }
  }, [
    dispatch,
    totalSupply,
    dataByContract,
    activeContractAddress,
    initialValue
  ]);

  // Effect that activates after totalSupply is obtained, and store has been initialized
  // Finds the next tokens that have not got any uri
  useEffect(() => {
    if (totalSupply && dataByContract[activeContractAddress]) {
      let list: number[] = missingUriByContract[activeContractAddress].filter(
        (_, index) => index <= 500
      );
      if (
        list.length &&
        JSON.stringify(list) !== JSON.stringify(pendingUriTokens)
      ) {
        setPendingUriTokens(list);
      }
    }
  }, [
    setPendingUriTokens,
    forceUpdate,
    activeContractAddress,
    dispatch,
    totalSupply,
    dataByContract,
    missingUriByContract,
    pendingUriTokens
  ]);

  // Effect that dispatches the uris that are present from blockchain
  // but not yet present in the store
  const stringCache = JSON.stringify(tokenURIs);
  useEffect(() => {
    if (totalSupply && dataByContract[activeContractAddress]) {
      let tokensToDispatch: any[] = [];
      let tokensToDispatchIds: any[] = [];

      pendingUriTokens.forEach((t, index) => {
        if (tokenURIs[index] && !dataByContract[activeContractAddress][t].uri) {
          tokensToDispatch = [
            ...tokensToDispatch,
            { tokenId: t, uri: tokenURIs[index][0] }
          ];
          tokensToDispatchIds = [...tokensToDispatchIds, t];
        }
      });

      if (tokensToDispatch.length) {
        dispatch(
          setMetadataURI({
            contractAddress: activeContractAddress,
            tokens: tokensToDispatch
          })
        );
      }
    }
  }, [
    activeContractAddress,
    stringCache,
    pendingUriTokens,
    totalSupply,
    dataByContract,
    dispatch,
    tokenURIs
  ]);

  // Effect to load when a different contract address is detected
  const prevActiveContractAddress = usePrevious(activeContractAddress);
  useEffect(() => {
    if (prevActiveContractAddress !== activeContractAddress) {
      Object.values(delayedImagesMap.current).forEach((e: any) => {
        if (e && e.controller) {
          e.controller.abort();
        }
      });
      Object.values(delayedJsonMap.current).forEach((e: any) => {
        if (e && e.controller) {
          e.controller.abort();
        }
      });
      delayedImagesMap.current = {};
      delayedJsonMap.current = {};
      imagesLoadedMap.current = {};
      setPendingUriTokens([]);
    }
  }, [activeContractAddress, prevActiveContractAddress]);

  const delayCachedImage = useCallback(
    async (
      tokenId: number,
      sleepTime: number,
      signal: any,
      imgSrc?: string
    ) => {
      await sleep(sleepTime, signal);

      let img: any = null;
      img = new window.Image();

      let imgUrl =
        imgSrc ?? dataByContract[activeContractAddress][tokenId].json.image;
      if (imgUrl.startsWith("ipfs:")) {
        imgUrl = ipfsGatewayUrl(imgUrl, ipfsGateway);
      }

      img.src = imgUrl;
      img.onload = () => {
        if (!signal.aborted) {
          imagesLoadedMap.current = {
            ...imagesLoadedMap.current,
            [tokenId]: img.src
          };

          let newDelayedImagesMap = { ...delayedImagesMap.current };
          delete newDelayedImagesMap[tokenId];
          delayedImagesMap.current = newDelayedImagesMap;

          forceUpdate();
        }
      };
      await sleep(10000, signal);

      // If image is not loading, retry
      if (!img.complete || !img.naturalWidth) {
        img.src = "";

        if (!signal.aborted) {
          const controller = new AbortController();

          const promise = delayCachedImage(tokenId, 0, signal, imgUrl);

          let newDelayedImagesMap = { ...delayedImagesMap.current };
          newDelayedImagesMap[tokenId] = { promise, controller };
          delayedImagesMap.current = newDelayedImagesMap;
        }
      }
    },
    [activeContractAddress, dataByContract, forceUpdate, ipfsGateway]
  );

  // Callback for obtaining the JSON Metadata
  const fetchTokenJSON = useCallback(
    async (tokenId: number, signal: any) => {
      if (
        !dataByContract[activeContractAddress] ||
        !dataByContract[activeContractAddress][tokenId]
      ) {
        return;
      }
      let uri = dataByContract[activeContractAddress][tokenId].uri;

      try {
        if (uri.startsWith("ipfs:")) {
          uri = ipfsGatewayUrl(uri, ipfsGateway);
        } else if (corsProxyUrl) {
          uri = corsProxyUrl + uri;
        }

        const response = await fetch(uri, { signal });
        const data = await response.text();

        dispatch(
          setMetadataJSON({
            contractAddress: activeContractAddress,
            tokens: [{ tokenId, json: JSON.parse(data) }]
          })
        );

        const controller = new AbortController();

        const promise = delayCachedImage(
          tokenId,
          2000,
          signal,
          JSON.parse(data).image
        );
        delayedImagesMap.current = {
          ...delayedImagesMap.current,
          [tokenId]: { promise, controller }
        };

        return data;
      } catch (error) {
        console.log(error);
      }
    },
    [
      dataByContract,
      activeContractAddress,
      dispatch,
      corsProxyUrl,
      ipfsGateway,
      delayCachedImage
    ]
  );

  const onItemsRendered = ({
    overscanStartIndex,
    overscanStopIndex,
    visibleStartIndex,
    visibleStopIndex
  }: any) => {
    Object.values(delayedImagesMap.current).forEach((e: any) => {
      if (e && e.controller) {
        e.controller.abort();
      }
    });

    Object.values(delayedJsonMap.current).forEach((e: any) => {
      if (e && e.controller) {
        e.controller.abort();
      }
    });

    delayedImagesMap.current = {};
    delayedJsonMap.current = {};

    const times = Math.floor(containerWidth / itemSize);
    const visibleFirstToken = visibleStartIndex * times;

    let visibleLastToken = visibleStopIndex * times + times;
    if (visibleLastToken > totalSupply.toNumber()) {
      visibleLastToken = totalSupply.toNumber();
    }

    let jsonDelay = 1;
    let imageDelay = 1;

    for (let i = visibleFirstToken; i <= visibleLastToken; i++) {
      const tokenId = parseInt(
        Object.keys(dataByContract[activeContractAddress])[i]
      );
      if (
        dataByContract[activeContractAddress][tokenId] &&
        (dataByContract[activeContractAddress][tokenId].json
          ? !dataByContract[activeContractAddress][tokenId].json.image
          : true) &&
        !delayedJsonMap.current[tokenId]
      ) {
        const controller = new AbortController();
        const signal = controller.signal;

        const promise = delayJson(tokenId, jsonDelay * 1000, signal);
        delayedJsonMap.current = {
          ...delayedJsonMap.current,
          [tokenId]: { promise, controller }
        };
        jsonDelay = jsonDelay + 1;
      }

      if (
        dataByContract[activeContractAddress][tokenId] &&
        dataByContract[activeContractAddress][tokenId].json &&
        dataByContract[activeContractAddress][tokenId].json.image &&
        !delayedImagesMap.current[tokenId] &&
        !imagesLoadedMap.current[tokenId]
      ) {
        const controller = new AbortController();
        const signal = controller.signal;

        const promise = delayCachedImage(
          tokenId,
          imageDelay * 2000,
          signal,
          dataByContract[activeContractAddress][tokenId].json.image
        );
        delayedImagesMap.current = {
          ...delayedImagesMap.current,
          [tokenId]: { promise, controller }
        };
        jsonDelay = jsonDelay + 1;
      }
    }
  };

  const delayJson = async (tokenId: number, sleepTime: number, signal: any) => {
    await sleep(sleepTime, signal);
    fetchTokenJSON(tokenId, signal);
  };

  // Function called for render the dinaymic table
  const cellRenderer = ({ index, style, ref }: any) => {
    const times = Math.floor(containerWidth / itemSize);
    const start = index * times;
    const cells = new Array(times)
      .fill({})
      .filter((_, index) => start + index < totalSupply.toNumber());

    return (
      <Flex direction="row" justify="center" style={style}>
        {cells.map((_, index) => {
          const tokenId = parseInt(
            Object.keys(dataByContract[activeContractAddress])[start + index]
          );

          return (
            <Link
              key={`${tokenId}-${index}`}
              onClick={() => {
                imagesLoadedMap.current[tokenId] && setTokenModal(tokenId);
              }}
            >
              <Box position="relative" _hover={{ background: "blue" }}>
                <Flex
                  height={itemSize}
                  width={itemSize}
                  bg="gray.900"
                  opacity={imagesLoadedMap.current[tokenId] ? 0 : 1}
                  position="absolute"
                  top="0"
                  _hover={{ opacity: "0.9" }}
                  justify="center"
                  align="center"
                  direction="column"
                >
                  <Text fontSize={{ base: 18, sm: 25, md: 40 }}>
                    #{tokenId.toLocaleString()}
                  </Text>
                  <Flex>
                    <Text ml={2} fontSize={{ base: 7, sm: 8, md: 10 }}>
                      {imagesLoadedMap.current[tokenId] &&
                      dataByContract[activeContractAddress][tokenId].json &&
                      dataByContract[activeContractAddress][tokenId].json.name
                        ? dataByContract[activeContractAddress][tokenId].json
                            .name
                        : !delayedImagesMap.current[tokenId] &&
                          !delayedJsonMap.current[tokenId]
                        ? "\u00A0"
                        : !dataByContract[activeContractAddress][tokenId].json
                        ? "LOADING METADATA"
                        : "LOADING IMAGE"}
                    </Text>
                  </Flex>
                </Flex>
                {imagesLoadedMap.current[tokenId] &&
                dataByContract[activeContractAddress][tokenId] &&
                dataByContract[activeContractAddress][tokenId].json &&
                dataByContract[activeContractAddress][tokenId].json.image ? (
                  <Image
                    boxSize={itemSize}
                    alt={`${tokenId}`}
                    title={`${tokenId}`}
                    loading="lazy"
                    src={imagesLoadedMap.current[tokenId]}
                  />
                ) : (
                  <Flex height={itemSize} width={itemSize}></Flex>
                )}
              </Box>
            </Link>
          );
        })}
      </Flex>
    );
  };

  return (
    <Fragment>
      {totalSupply && loadedUris ? (
        <Fragment>
          {tokenModal !== null ? (
            <GalleryModal
              tokenId={tokenModal}
              imgUrl={imagesLoadedMap.current[tokenModal]}
              onClose={() => {
                setTokenModal(null);
              }}
            />
          ) : null}

          <Flex direction="column" align="center">
            <Flex wrap="wrap" justify="center">
              <div
                id="virtualContainer"
                style={{ width: containerWidth, height: "100%" }}
              >
                <ReactWindowScroller listRef={listRef}>
                  {({ ref, outerRef, style, onScroll }: any) => (
                    <List
                      style={style}
                      outerRef={outerRef}
                      ref={ref}
                      height={window.innerHeight}
                      itemCount={Math.ceil(
                        totalSupply.toNumber() /
                          Math.floor(containerWidth / itemSize)
                      )}
                      itemSize={itemSize}
                      width={window.innerWidth}
                      onScroll={onScroll}
                      onItemsRendered={debounce(onItemsRendered, 1000)}
                    >
                      {cellRenderer}
                    </List>
                  )}
                </ReactWindowScroller>
              </div>
            </Flex>
          </Flex>
        </Fragment>
      ) : (
        <Flex p={5} mt={8} align="center" justify="center" direction="column">
          <Box color="gray.700">
            <Spinner />
          </Box>
          <Box mt={2}>
            <Text textAlign="center">
              {" "}
              {!wrongNetWork
                ? `Loading data from the blockchain, please wait`
                : "Please connect to Ethereum Network"}
            </Text>
            <Text textAlign="center">
              {totalSupply &&
              !loadedUris &&
              missingUriByContract[activeContractAddress] &&
              missingUriByContract[activeContractAddress].length <
                totalSupply.toNumber()
                ? `[ ${missingUriByContract[
                    activeContractAddress
                  ].length.toLocaleString()} / ${
                    totalSupply ? totalSupply.toNumber().toLocaleString() : ""
                  } ]`
                : ""}
            </Text>
          </Box>
        </Flex>
      )}
    </Fragment>
  );
};

export default Gallery;
