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
  const [itemSize, setItemSize] = useState(300);

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
  // imageDelayCounter.current = 0;
  const jsonDelayCounter: any = useRef(0);
  // jsonDelayCounter.current = 0;

  // Map of the Promises of the tokens to be loaded after delay
  const delayedImagesMap: any = useRef({});
  const delayedJsonMap: any = useRef({});
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

  const refreshViewport = debounce(async () => {
    // imageDelayCounter.current = 0;
    // jsonDelayCounter.current = 0;
    // Object.values(delayedImagesMap.current).forEach((e: any) => {
    //   if (e && e.controller) {
    //     e.controller.abort();
    //   }
    // });
    // delayedImagesMap.current = {};
    //
    // Object.values(delayedJsonMap.current).forEach((e: any) => {
    //   if (e && e.controller) {
    //     e.controller.abort();
    //   }
    // });
    // delayedJsonMap.current = {};
  }, 500);

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
      imageDelayCounter.current = 0;
      jsonDelayCounter.current = 0;
      pendingUriTokens.current = [];
      downloadedMetadataTokens.current = [];
    }
  }, [activeContractAddress, prevActiveContractAddress]);

  // Event that is triggered after a scroll is made on the page
  useEffect(() => {
    window.addEventListener("scroll", refreshViewport);
    return () => {
      window.removeEventListener("scroll", refreshViewport);
    };
  }, [activeContractAddress, dataByContract, refreshViewport]);

  // Effect when first loaded all the images (after fetching all URIS)
  const prevLoadedUris = usePrevious(loadedUris);
  useEffect(() => {
    if (prevLoadedUris === false && loadedUris === true) {
      refreshViewport();
      downloadedMetadataTokens.current = [];
    }
  }, [loadedUris, prevLoadedUris, refreshViewport]);

  // Function that receives the token ID and an sleep time
  // it will generate the image after sleep is finished
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

        const controller = new AbortController();
        const signal = controller.signal;

        const promise = delayCachedImage(tokenId, 0, signal, imgUrl);

        let newDelayedImagesMap = { ...delayedImagesMap.current };
        newDelayedImagesMap[tokenId] = { promise, controller };
        delayedImagesMap.current = newDelayedImagesMap;
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
        downloadedMetadataTokens.current = [
          ...downloadedMetadataTokens.current,
          tokenId
        ];

        const controller = new AbortController();

        const promise = delayCachedImage(
          tokenId,
          imageDelayCounter,
          signal,
          JSON.parse(data).image
        );
        delayedImagesMap.current = {
          ...delayedImagesMap.current,
          [tokenId]: { promise, controller }
        };

        imageDelayCounter.current = imageDelayCounter.current + 2000;
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

  // Callback called when the image delay is finished
  let toggle = true;
  const addFinishedDelay = () => {
    if (toggle) {
      delayFinishedTokens.current = cellRendererList;
      toggle = false;
      forceUpdate();
    }
  };
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
    delayedImagesMap.current = {};

    Object.values(delayedJsonMap.current).forEach((e: any) => {
      if (e && e.controller) {
        e.controller.abort();
      }
    });

    delayedJsonMap.current = {};

    const times = Math.floor(containerWidth / itemSize);
    // TODO Move this to state/ref Variables
    // Add an effect, when dataByContract[activeContractAddress] contains tokens that
    // change their json.image from emtpy to a value
    // use this tokens to call delayCachedImage instead of the
    // await call on fetchTokenJSON
    const visibleFirstToken = visibleStartIndex * times;
    let visibleLastToken = visibleStopIndex * times + times;
    if (visibleLastToken > totalSupply.toNumber()) {
      visibleLastToken = totalSupply.toNumber();
    }
    jsonDelayCounter.current = 0;
    imageDelayCounter.current = 0;

    for (let i = visibleFirstToken; i <= visibleLastToken; i++) {
      const tokenId = parseInt(
        Object.keys(dataByContract[activeContractAddress])[i]
      );

      if (!cellRendererList.includes(tokenId)) {
        cellRendererList.push(tokenId);
      }
      if (
        dataByContract[activeContractAddress][tokenId] &&
        (dataByContract[activeContractAddress][tokenId].json
          ? !dataByContract[activeContractAddress][tokenId].json.image
          : true) &&
        !delayedJsonMap.current[tokenId]
      ) {
        const controller = new AbortController();
        const signal = controller.signal;

        const promise = delayJson(tokenId, jsonDelayCounter.current, signal);
        delayedJsonMap.current = {
          ...delayedJsonMap.current,
          [tokenId]: { promise, controller }
        };
        jsonDelayCounter.current = jsonDelayCounter.current + 1000;
      }

      if (
        dataByContract[activeContractAddress][tokenId] &&
        dataByContract[activeContractAddress][tokenId].json &&
        dataByContract[activeContractAddress][tokenId].json.image &&
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
        imageDelayCounter.current = imageDelayCounter.current + 2000;
      }
    }
  };

  // Updates the state  with the window values
  const resize = () => {
    if (window.innerWidth < 500) {
      setItemSize(120);
    } else {
      setItemSize(200);
    }
    setWindowSize({
      height: window.innerHeight,
      width: window.innerWidth
    });
  };

  const delayJson = async (tokenId: number, sleepTime: number, signal: any) => {
    await sleep(sleepTime, signal);
    fetchTokenJSON(tokenId, signal);
  };

  // Function called for render the dinaymic table
  let cellRendererList: number[] = [];
  const cellRendererListRef = useRef(cellRendererList);
  cellRendererListRef.current = cellRendererList;
  const cellRenderer = ({ index, style, ref }: any) => {
    const times = Math.floor(containerWidth / itemSize);
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
      // if (
      //   dataByContract[activeContractAddress][tokenId] &&
      //   (dataByContract[activeContractAddress][tokenId].json
      //     ? !dataByContract[activeContractAddress][tokenId].json.image
      //     : true) &&
      //   !delayedJsonMap.current[tokenId]
      // ) {
      //   const controller = new AbortController();
      //   const signal = controller.signal;
      //
      //   const promise = delayJson(tokenId, jsonDelayCounter.current, signal);
      //   delayedJsonMap.current = {
      //     ...delayedJsonMap.current,
      //     [tokenId]: { promise, controller }
      //   };
      //   jsonDelayCounter.current = jsonDelayCounter.current + 250;
      // }
      //
      // if (
      //   dataByContract[activeContractAddress][tokenId] &&
      //   dataByContract[activeContractAddress][tokenId].json &&
      //   dataByContract[activeContractAddress][tokenId].json.image &&
      //   delayFinishedTokens.current.includes(tokenId) &&
      //   !delayedImagesMap.current[tokenId] &&
      //   !imagesLoadedMap.current[tokenId]
      // ) {
      //   const controller = new AbortController();
      //   const signal = controller.signal;
      //
      //   const promise = delayCachedImage(
      //     tokenId,
      //     imageDelayCounter.current,
      //     signal
      //   );
      //   delayedImagesMap.current = {
      //     ...delayedImagesMap.current,
      //     [tokenId]: { promise, controller }
      //   };
      //   imageDelayCounter.current = imageDelayCounter.current + 500;
      // }
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
                  itemSize={itemSize}
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
                          Math.floor(containerWidth / itemSize)
                      )}
                      itemSize={itemSize}
                      width={window.innerWidth}
                      onScroll={onScroll}
                      onItemsRendered={debounce(onItemsRendered, 2000)}
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
              {totalSupply && missingUri && missingUri < totalSupply.toNumber()
                ? `[ ${missingUri.toLocaleString()} / ${
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
