import { Fragment, useEffect, useState, useRef, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { FixedSizeList as List } from "react-window";
import { ReactWindowScroller } from "react-window-scroller";
import { init, setMetadataURI, setMetadataJSON } from "./redux/contractsSlice";
import { RootState } from "./redux/store";
import { RouteComponentProps } from "@reach/router";
import { useEthers } from "@usedapp/core";
import { Flex, Box, Text, Spinner, Link } from "@chakra-ui/react";

import useTotalSupply from "./hooks/useTotalSupply";
import useTokenURI from "./hooks/useTokenURI";
import useTokenByIndex from "./hooks/useTokenByIndex";
import usePrevious from "./hooks/usePrevious";
import useForceUpdate from "./hooks/useForceUpdate";
import debounce from "debounce";

import { configChainId } from "./constants";

import GalleryModal from "./GalleryModal";
import DelayedImage from "./DelayedImage";
import ipfsGatewayUrl from "./helpers/ipfsGatewayUrl";
import sleep from "./helpers/sleep";

const Gallery: React.FC<RouteComponentProps> = () => {
  // useDapp hooks
  const { chainId } = useEthers();
  const forceUpdate = useForceUpdate();

  // redux
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

  const dispatch = useDispatch();

  // chakra hooks
  // const toast = useToast();

  // contract hooks
  const totalSupply = useTotalSupply(activeContractAddress);
  const [tokensByIndex] = useTokenByIndex(activeContractAddress, [0]);
  const initialValue = tokensByIndex ? tokensByIndex[0] : null;

  // Effect to initialize store with the contract token skeleton data
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

  const pendingUriTokensRef = useRef<number[]>([]);
  const tokenURIs = useTokenURI(
    activeContractAddress,
    pendingUriTokensRef.current
  );

  // Effect that activates after totalSupply is obtained, and store has been initialized
  // Finds the next tokens that have not yet get any uri
  useEffect(() => {
    if (totalSupply && dataByContract[activeContractAddress]) {
      let list: number[] = [];
      Object.keys(dataByContract[activeContractAddress]).forEach(key => {
        if (!dataByContract[activeContractAddress][key].uri) {
          list = [...list, parseInt(key)];
        }
      });

      list = list.filter((_, index) => index <= 500);
      pendingUriTokensRef.current = list;
    }
  }, [activeContractAddress, dispatch, totalSupply, dataByContract]);

  // Effect that dispatches the uris that are present from blockchain
  // but not yet present in the store
  const stringCache = JSON.stringify(tokenURIs);
  useEffect(() => {
    if (totalSupply && dataByContract[activeContractAddress]) {
      let tokensToDispatch: any[] = [];
      let tokensToDispatchIds: any[] = [];

      pendingUriTokensRef.current.forEach((t, index) => {
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
    pendingUriTokensRef,
    totalSupply,
    dataByContract,
    dispatch,
    tokenURIs
  ]);

  const containerWidth = window.innerWidth * 0.9;
  const wrongNetWork = chainId !== configChainId;
  const finishedRef: any = useRef([]);
  // const [useCorsProxy] = useState<boolean>(true);
  const [tokenModal, setTokenModal] = useState<number | null>(null);

  // Array of tokens that have downloaded JSON Metadata
  const fetchedRef: any = useRef(
    dataByContract[activeContractAddress]
      ? Object.keys(dataByContract[activeContractAddress])
          .filter(key => dataByContract[activeContractAddress][key].json)
          .map(e => parseInt(e))
      : []
  );

  // Callback for obraining the JSON Metadata
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
          // uri = "https://cors-anywhere.herokuapp.com/" + uri;
          uri = corsProxyUrl + uri;
        }

        const response = await fetch(uri, {
          headers: { Origin: "http://localhost" }
        });
        const data = await response.text();

        dispatch(
          setMetadataJSON({
            contractAddress: activeContractAddress,
            tokens: [{ tokenId, json: JSON.parse(data) }]
          })
        );
        fetchedRef.current = [...fetchedRef.current, tokenId];
        return data;
      } catch (error) {
        const timeout = timeoutsRef.current[tokenId];
        clearTimeout(timeout);

        let newTimeoutsRef = { ...timeoutsRef.current };
        delete newTimeoutsRef[tokenId];
        timeoutsRef.current = newTimeoutsRef;

        counterRef.current = 0;
        console.log(error);
      }
    },
    [dataByContract, activeContractAddress, dispatch, corsProxyUrl, ipfsGateway]
  );

  // TODO: Make this cancelable
  const fetchViewportJSON = debounce(async () => {
    counterRef.current = 0;
    let sleepCounter = 1;

    Object.values(timeoutsRef.current).forEach((e: any) => {
      if (e && e.controller) {
        e.controller.abort();
      }
    });

    timeoutsRef.current = {};
    for (
      let index = cellRendererListRef.current.includes(1)
        ? 0
        : Math.floor(cellRendererListRef.current.length / 3);
      index < cellRendererListRef.current.length;
      index++
    ) {
      if (!fetchedRef.current.includes(cellRendererListRef.current[index])) {
        await sleep(sleepCounter * 500);
        // It checks again if not exists on fetchedRef, because maybe it changed
        if (!fetchedRef.current.includes(cellRendererListRef.current[index])) {
          fetchTokenJSON(cellRendererListRef.current[index]);
        }
        sleepCounter++;
      }
    }
  }, 2000);

  // Event that is triggered after a scroll is made on the page
  useEffect(() => {
    window.addEventListener("scroll", fetchViewportJSON);
    return () => {
      window.removeEventListener("scroll", fetchViewportJSON);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeContractAddress, dataByContract]);

  // List of Tokens rendered
  let cellRendererList: number[] = [];

  // Reference of the cell values rendered
  const cellRendererListRef = useRef(cellRendererList);
  cellRendererListRef.current = cellRendererList;

  // Callback called when the image delay is finished
  let toggle = true;
  const addFinishedDelay = () => {
    if (toggle) {
      finishedRef.current = cellRendererList;
      toggle = false;
      forceUpdate();
    }
  };

  const loadedUris =
    dataByContract &&
    dataByContract[activeContractAddress] &&
    Object.values(dataByContract[activeContractAddress]).every(
      (e: any) => e.uri
    );

  const prevLoadedUris = usePrevious(loadedUris);
  const prevActiveContractAddress = usePrevious(activeContractAddress);
  useEffect(() => {
    if (prevActiveContractAddress !== activeContractAddress) {
      Object.values(timeoutsRef.current).forEach((e: any) => {
        if (e && e.controller) {
          e.controller.abort();
        }
      });
      setTimeout(() => {
        timeoutsRef.current = {};
        loadedRef.current = {};
        counterRef.current = 0;
        pendingUriTokensRef.current = [];
      }, 100);
    }
  }, [activeContractAddress, prevActiveContractAddress, fetchViewportJSON]);

  useEffect(() => {
    if (prevLoadedUris === false && loadedUris === true) {
      fetchViewportJSON();
      fetchedRef.current = [];
    }
  }, [loadedUris, prevLoadedUris, fetchViewportJSON]);

  // Map of the active timeoutes
  const timeoutsRef: any = useRef({});

  // Map of the counter used for timeouts
  const counterRef: any = useRef(0);

  // Map of the tokens already loaded
  const loadedRef: any = useRef({});

  // Function that receives the token ID, and an sleep time
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
      // await img.decode();
      loadedRef.current = { ...loadedRef.current, [tokenId]: img.src };

      let newTimeoutsRef = { ...timeoutsRef.current };
      delete newTimeoutsRef[tokenId];
      timeoutsRef.current = newTimeoutsRef;

      forceUpdate();
    };
    //
    await sleep(30000, signal);
    // If image is not loading, remove the timeout (so it can be created again)
    if (!img.complete || !img.naturalWidth) {
      // window.stop();
      img.src = "";
      let newTimeoutsRef = { ...timeoutsRef.current };
      delete newTimeoutsRef[tokenId];
      timeoutsRef.current = newTimeoutsRef;
    }
  };

  const missingUri = dataByContract[activeContractAddress]
    ? Object.values(dataByContract[activeContractAddress]).filter(
        ({ uri }: any) => !uri
      ).length
    : null;

  // Function called for render the dinaymic table
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
        // forceUpdate();
      }
      if (
        dataByContract[activeContractAddress][tokenId] &&
        dataByContract[activeContractAddress][tokenId].json &&
        finishedRef.current.includes(tokenId) &&
        !timeoutsRef.current[tokenId] &&
        !loadedRef.current[tokenId]
      ) {
        const controller = new AbortController();
        const signal = controller.signal;

        const promise = delayCachedImage(tokenId, counterRef.current, signal);
        timeoutsRef.current = {
          ...timeoutsRef.current,
          [tokenId]: { promise, controller }
        };
        counterRef.current = counterRef.current + 500;
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
                loadedRef.current[tokenId] && setTokenModal(tokenId);
              }}
            >
              <Box position="relative" _hover={{ background: "blue" }}>
                <Flex
                  height="200px"
                  width="200px"
                  bg="gray.900"
                  opacity={loadedRef.current[tokenId] ? 0 : 1}
                  position="absolute"
                  top="0"
                  _hover={{ opacity: "0.9" }}
                  justify="center"
                  align="center"
                  direction="column"
                >
                  <Text fontSize={40}>#{tokenId}</Text>
                  {!loadedRef.current[tokenId] ? (
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
                  src={loadedRef.current[tokenId]}
                  metadata={
                    (dataByContract[activeContractAddress][tokenId] &&
                      dataByContract[activeContractAddress][tokenId].json) ??
                    undefined
                  }
                  isFinishedDelay={finishedRef.current.includes(tokenId)}
                  isLoadedImage={loadedRef.current[tokenId]}
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
              imgUrl={loadedRef.current[tokenModal]}
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
                ? `Loading data from the blockchain, please wait.. ${
                    totalSupply && missingUri !== totalSupply.toNumber()
                      ? `[${missingUri} / ${
                          totalSupply ? totalSupply.toNumber() : ""
                        }]`
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
