import { useEffect, useState, useCallback, Fragment } from "react";
import { Box, Flex, Link } from "@chakra-ui/react";
import { RootState } from "./redux/store";
import useTokenByIndex from "./hooks/useTokenByIndex";
import useTotalSupply from "./hooks/useTotalSupply";
import { useSelector } from "react-redux";

const Navigator = ({ listRef }) => {
  const containerWidth = window.innerWidth * 0.9;
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  // Updates the state  with the window values
  const resize = useCallback(() => {
    setWindowSize({
      height: window.innerHeight,
      width: window.innerWidth
    });
  }, []);

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

  const activeContractAddress = useSelector(
    ({ contracts: { activeContractAddress } }: RootState) =>
      activeContractAddress
  );
  const dataByContract = useSelector(
    ({ contracts: { dataByContract } }: RootState) => dataByContract
  );
  const missingUriByContract = useSelector(
    ({ contracts: { missingUriByContract } }: RootState) => missingUriByContract
  );
  const itemSize = useSelector(
    ({ options: { itemSize } }: RootState) => itemSize
  );

  const totalSupply = useTotalSupply(activeContractAddress);
  const [tokensByIndex] = useTokenByIndex(activeContractAddress, [0]);
  const initialValue = tokensByIndex ? tokensByIndex[0] : null;

  const offsetScroll = 30;
  const [indicatorPosition, setIndicatorPosition] = useState({
    x: 0,
    y: offsetScroll
  });
  const [ratio, setRatio] = useState(0);
  useEffect(() => {
    const fn = (e: any) => {
      const yPos =
        (window.scrollY / document.body.offsetHeight) * window.innerHeight;

      setRatio(window.scrollY / document.body.offsetHeight);

      const ratio = window.scrollY / document.body.offsetHeight;
      setIndicatorPosition({
        x: indicatorPosition.x,
        y: yPos + offsetScroll - ratio * offsetScroll - ratio * offsetScroll
      });
    };

    window.addEventListener("scroll", fn);
    return () => {
      window.removeEventListener("scroll", fn);
    };
  }, [indicatorPosition]);

  const numItems = 8;
  let chunks: number[] = [];
  if (
    totalSupply &&
    initialValue &&
    dataByContract[activeContractAddress] &&
    Object.values(dataByContract[activeContractAddress]).length
  ) {
    let increase = Math.floor(totalSupply.toNumber() / (numItems + 1));
    let items: any = [];
    for (let i = 1; i < numItems + 1; i++) {
      items = [
        ...items,
        items.length ? items[items.length - 1] + increase : increase
      ];
    }

    chunks = [
      initialValue.toNumber(),
      ...items,
      parseInt(
        Object.keys(dataByContract[activeContractAddress])[
          Object.keys(dataByContract[activeContractAddress]).length - 1
        ]
      )
    ];
  }

  // Flag that indicates all URIs of the gallery have been obtained
  const loadedUris =
    missingUriByContract[activeContractAddress] &&
    missingUriByContract[activeContractAddress].length === 0;

  const isReady =
    loadedUris &&
    totalSupply &&
    initialValue &&
    dataByContract[activeContractAddress];
  const offset = 1000;
  let itemView = totalSupply ? totalSupply.toNumber() * ratio : 1;

  return (
    <Fragment>
      <Flex
        position="fixed"
        right="0"
        top="0"
        width="70px"
        height={windowSize.height}
        direction="column"
        justify="space-between"
        bg="gray.900"
        pb="15px"
        pt="15px"
        pl="10px"
      >
        {isReady &&
          chunks.map((num, index) => {
            let growthPercentage: number | null = null;
            if (itemView >= num && itemView < num + offset) {
              growthPercentage = itemView === 0 ? 0 : (itemView - num) / offset;
            } else if (itemView <= num && itemView > num - offset) {
              growthPercentage = (num - itemView) / offset;
            }
            return (
              <Box
                key={index}
                textAlign="end"
                mr={2}
                fontSize={
                  growthPercentage != null ? 20 - 10 * growthPercentage : 10
                }
              >
                <Link
                  onClick={() => {
                    const times = Math.floor(containerWidth / itemSize);
                    const numTo = Math.floor(num / times);
                    listRef.current.scrollToItem(numTo, "start");
                  }}
                >
                  {num.toLocaleString()}
                </Link>
              </Box>
            );
          })}
      </Flex>
      <Box
        width="70px"
        opacity="0.1"
        bg="white"
        height="2px"
        position="fixed"
        fontSize={10}
        right={indicatorPosition.x}
        top={indicatorPosition.y}
      />
    </Fragment>
  );
};
export default Navigator;
