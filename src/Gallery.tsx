import { Fragment, useEffect, useState, useRef, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { FixedSizeList as List } from "react-window";
import { ReactWindowScroller } from "react-window-scroller";
import { RouteComponentProps } from "@reach/router";
import { useEthers } from "@usedapp/core";
import { Flex, Box, Text, Spinner, Link } from "@chakra-ui/react";
import debounce from "debounce";

import { init, setMetadataURI, setMetadataJSON } from "./redux/contractsSlice";
import { RootState } from "./redux/store";

import useTotalSupply from "./hooks/useTotalSupply";
import useTokenURI from "./hooks/useTokenURI";
import useTokenByIndex from "./hooks/useTokenByIndex";
import usePrevious from "./hooks/usePrevious";
import useForceUpdate from "./hooks/useForceUpdate";

import { configChainId } from "./constants";

import GalleryModal from "./GalleryModal";
import DelayedImage from "./DelayedImage";

import ipfsGatewayUrl from "./helpers/ipfsGatewayUrl";
import sleep from "./helpers/sleep";

const Gallery: React.FC<RouteComponentProps> = () => {
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
  const corsProxyUrl = useSelector(
    ({ options: { corsProxyUrl } }: RootState) => corsProxyUrl
  );
  const ipfsGateway = useSelector(
    ({ options: { ipfsGateway } }: RootState) => ipfsGateway
  );

  // Calculated
  const containerWidth = window.innerWidth * 0.9;
  const wrongNetWork = chainId !== configChainId;
  const missingUri = dataByContract[activeContractAddress]
    ? Object.values(dataByContract[activeContractAddress]).filter(
        ({ uri }: any) => !uri
      ).length
    : null;
  // Flag that indicates all URIs of the gallery have been obtained
  const loadedUris =
    dataByContract &&
    dataByContract[activeContractAddress] &&
    Object.values(dataByContract[activeContractAddress]).every(
      (e: any) => e.uri
    );

  // States
  // State of the modal, stores the tokenId to show or null if hidden
  const [tokenModal, setTokenModal] = useState<number | null>(null);
  // Stores Window sizes, it rerenders page with each resize
  const [, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  // References
  // Array of tokens that finished delaying and ready to load
  const delayFinishedTokens: any = useRef([]);
  // Array of tokens that have not yet gotten a URI
  const pendingUriTokens = useRef<number[]>([]);
  // Array of tokens that have downloaded JSON Metadata
  const downloadedMetadataTokens: any = useRef(
    dataByContract[activeContractAddress]
      ? Object.keys(dataByContract[activeContractAddress])
          .filter(key => dataByContract[activeContractAddress][key].json)
          .map(e => parseInt(e))
      : []
  );
  // Delay of image loading
  const imageDelayCounter: any = useRef(0);
  // Map of the Promises of the tokens to be loaded after delay
  const delayedImagesMap: any = useRef({});
  // Map of the images of the tokens already loaded
  const imagesLoadedMap: any = useRef({});

  // Contract hooks
  const totalSupply = useTotalSupply(activeContractAddress);
  const [initialToken] = useTokenByIndex(activeContractAddress, [0]);
  const tokenURIs = useTokenURI(
    activeContractAddress,
    pendingUriTokens.current
  );

  // Effect to recalculate size
  useEffect(() => {
    resize();
    window.addEventListener("resize", () => {
      resize();
    });

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, []);

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
      let list: number[] = [];
      Object.keys(dataByContract[activeContractAddress]).forEach(key => {
        if (!dataByContract[activeContractAddress][key].uri) {
          list = [...list, parseInt(key)];
        }
      });

      list = list.filter((_, index) => index <= 500);
      pendingUriTokens.current = list;
    }
  }, [activeContractAddress, dispatch, totalSupply, dataByContract]);

  // Effect that dispatches the uris that are present from blockchain
  // but not yet present in the store
  const stringCache = JSON.stringify(tokenURIs);
  useEffect(() => {
    if (totalSupply && dataByContract[activeContractAddress]) {
      let tokensToDispatch: any[] = [];
      let tokensToDispatchIds: any[] = [];

      pendingUriTokens.current.forEach((t, index) => {
        if (tokenURIs[index] && !dataByContract[activeContractAddress][t].uri) {
          // TODO Optimize this
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

  // TODO: Make this cancelable
  const fetchViewportJSON = debounce(async () => {
    imageDelayCounter.current = 0;
    let sleepCounter = 1;

    Object.values(delayedImagesMap.current).forEach((e: any) => {
      if (e && e.controller) {
        e.controller.abort();
      }
    });

    delayedImagesMap.current = {};
    for (
      let index = cellRendererListRef.current.includes(1)
        ? 0
        : Math.floor(cellRendererListRef.current.length / 3);
      index < cellRendererListRef.current.length;
      index++
    ) {
      if (
        !downloadedMetadataTokens.current.includes(
          cellRendererListRef.current[index]
        )
      ) {
        await sleep(sleepCounter * 500);
        // It checks again if not exists on downloadedMetadataTokens, because maybe it changed
        if (
          !downloadedMetadataTokens.current.includes(
            cellRendererListRef.current[index]
          )
        ) {
          fetchTokenJSON(cellRendererListRef.current[index]);
        }
        sleepCounter++;
      }
    }
  }, 2000);

  // Effect to load when a different contract address is detected
  const prevActiveContractAddress = usePrevious(activeContractAddress);
  useEffect(() => {
    if (prevActiveContractAddress !== activeContractAddress) {
      Object.values(delayedImagesMap.current).forEach((e: any) => {
        if (e && e.controller) {
          e.controller.abort();
        }
      });
      setTimeout(() => {
        delayedImagesMap.current = {};
        imagesLoadedMap.current = {};
        imageDelayCounter.current = 0;
        pendingUriTokens.current = [];
      }, 100);
    }
  }, [activeContractAddress, prevActiveContractAddress, fetchViewportJSON]);

  // Event that is triggered after a scroll is made on the page
  useEffect(() => {
    window.addEventListener("scroll", fetchViewportJSON);
    return () => {
      window.removeEventListener("scroll", fetchViewportJSON);
    };
  }, [activeContractAddress, dataByContract, fetchViewportJSON]);

  // Effect when first loaded all the images (after fetching all URIS)
  const prevLoadedUris = usePrevious(loadedUris);
  useEffect(() => {
    if (prevLoadedUris === false && loadedUris === true) {
      fetchViewportJSON();
      downloadedMetadataTokens.current = [];
    }
  }, [loadedUris, prevLoadedUris, fetchViewportJSON]);

  // Callback for obtaining the JSON Metadata
  const fetchTokenJSON = useCallback(
    async (tokenId: number) => {
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

        const response = await fetch(uri);
        const data = await response.text();

        dispatch(
          setMetadataJSON({
            contractAddress: activeContractAddress,
            tokens: [{ tokenId, json: JSON.parse(data) }]
          })
        );
        downloadedMetadataTokens.current = [
          ...downloadedMetadataTokens.current,
          tokenId
        ];
        return data;
      } catch (error) {
        const timeout = delayedImagesMap.current[tokenId];
        clearTimeout(timeout);

        let newDelayedImagesMap = { ...delayedImagesMap.current };
        delete newDelayedImagesMap[tokenId];
        delayedImagesMap.current = newDelayedImagesMap;

        imageDelayCounter.current = 0;
        console.log(error);
      }
    },
    [dataByContract, activeContractAddress, dispatch, corsProxyUrl, ipfsGateway]
  );

  // Callback called when the image delay is finished
  let toggle = true;
  const addFinishedDelay = () => {
    if (toggle) {
      delayFinishedTokens.current = cellRendererList;
      toggle = false;
      forceUpdate();
    }
  };

  // Updates the state  with the window values
  const resize = () => {
    setWindowSize({
      height: window.innerHeight,
      width: window.innerWidth
    });
  };

  // Function that receives the token ID and an sleep time
  // it will generate the image after sleep is finished
  const delayCachedImage = async (
    tokenId: number,
    sleepTime: number,
    signal: any
  ) => {
    await sleep(sleepTime, signal);

    let img: any = null;
    img = new window.Image();

    let imgUrl = dataByContract[activeContractAddress][tokenId].json.image;
    if (imgUrl.startsWith("ipfs:")) {
      imgUrl = ipfsGatewayUrl(imgUrl, ipfsGateway);
    }

    img.src = imgUrl;
    img.onload = () => {
      imagesLoadedMap.current = {
        ...imagesLoadedMap.current,
        [tokenId]: img.src
      };

      let newDelayedImagesMap = { ...delayedImagesMap.current };
      delete newDelayedImagesMap[tokenId];
      delayedImagesMap.current = newDelayedImagesMap;

      forceUpdate();
    };
    await sleep(30000, signal);

    // If image is not loading, remove the timeout (so it can be created again)
    if (!img.complete || !img.naturalWidth) {
      img.src = "";
      let newDelayedImagesMap = { ...delayedImagesMap.current };
      delete newDelayedImagesMap[tokenId];
      delayedImagesMap.current = newDelayedImagesMap;
    }
  };

  // Function called for render the dinaymic table
  let cellRendererList: number[] = [];
  const cellRendererListRef = useRef(cellRendererList);
  cellRendererListRef.current = cellRendererList;
  const cellRenderer = ({ index, style, ref }: any) => {
    const times = Math.floor(containerWidth / 200);
    const start = index * times;
    const cells = new Array(times)
      .fill({})
      .filter((_, index) => start + index < totalSupply.toNumber());
    for (let i = 0; i < cells.length; i++) {
      const tokenId = parseInt(
        Object.keys(dataByContract[activeContractAddress])[start + i]
      );
      if (!cellRendererList.includes(tokenId)) {
        cellRendererList.push(tokenId);
      }
      if (
        dataByContract[activeContractAddress][tokenId] &&
        dataByContract[activeContractAddress][tokenId].json &&
        delayFinishedTokens.current.includes(tokenId) &&
        !delayedImagesMap.current[tokenId] &&
        !imagesLoadedMap.current[tokenId]
      ) {
        const controller = new AbortController();
        const signal = controller.signal;

        const promise = delayCachedImage(
          tokenId,
          imageDelayCounter.current,
          signal
        );
        delayedImagesMap.current = {
          ...delayedImagesMap.current,
          [tokenId]: { promise, controller }
        };
        imageDelayCounter.current = imageDelayCounter.current + 500;
      }
    }

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
                  height="200px"
                  width="200px"
                  bg="gray.900"
                  opacity={imagesLoadedMap.current[tokenId] ? 0 : 1}
                  position="absolute"
                  top="0"
                  _hover={{ opacity: "0.9" }}
                  justify="center"
                  align="center"
                  direction="column"
                >
                  <Text fontSize={40}>#{tokenId}</Text>
                  {!imagesLoadedMap.current[tokenId] ? (
                    <Flex>
                      <Text ml={2} fontSize={10}>
                        LOADING...
                      </Text>
                    </Flex>
                  ) : null}
                </Flex>
                <DelayedImage
                  setFinishedDelay={addFinishedDelay}
                  boxSize="200px"
                  index={index}
                  alt={`${tokenId}`}
                  title={`${tokenId}`}
                  loading="lazy"
                  tokenId={tokenId}
                  src={imagesLoadedMap.current[tokenId]}
                  metadata={
                    (dataByContract[activeContractAddress][tokenId] &&
                      dataByContract[activeContractAddress][tokenId].json) ??
                    undefined
                  }
                  isFinishedDelay={delayFinishedTokens.current.includes(
                    tokenId
                  )}
                  isLoadedImage={imagesLoadedMap.current[tokenId]}
                />
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
                <ReactWindowScroller>
                  {({ ref, outerRef, style, onScroll }: any) => (
                    <List
                      style={style}
                      outerRef={outerRef}
                      ref={ref}
                      height={window.innerHeight}
                      itemCount={Math.ceil(
                        totalSupply.toNumber() /
                          Math.floor(containerWidth / 200)
                      )}
                      itemSize={200}
                      width={window.innerWidth}
                      onScroll={onScroll}
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
        <Flex height="50vh" align="center" justify="center" direction="column">
          <Box color="gray.700">
            <Spinner />
          </Box>
          <Box mt={2}>
            <Text textAlign="center">
              {" "}
              {!wrongNetWork
                ? `Loading data from the blockchain, please wait ${
                    totalSupply && missingUri !== totalSupply.toNumber()
                      ? `[ ${missingUri} / ${
                          totalSupply ? totalSupply.toNumber() : ""
                        } ]`
                      : ""
                  }`
                : "Please connect to Ethereum Network"}
            </Text>
          </Box>
        </Flex>
      )}
    </Fragment>
  );
};

export default Gallery;
