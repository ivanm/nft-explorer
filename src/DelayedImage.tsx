import { useEffect } from "react";
import { Image, Flex } from "@chakra-ui/react";
import sleep from "./helpers/sleep";

interface DelayedImageProps {
  boxSize: string;
  alt: string;
  title: string;
  src: string;
  index: number;
  loading: "eager" | "lazy" | undefined;
  tokenId: number;
  setFinishedDelay: (newImage: number) => void;
  isFinishedDelay: boolean;
  isLoadedImage: boolean;
  metadata: any;
  itemSize: number;
}

const DelayedImage = ({
  boxSize,
  alt,
  title,
  loading,
  tokenId,
  src,
  index,
  setFinishedDelay,
  isFinishedDelay,
  isLoadedImage,
  metadata,
  itemSize
}: DelayedImageProps) => {
  useEffect(() => {
    const delayed = async () => {
      await sleep(1500);
      if (!isFinishedDelay) {
        setFinishedDelay(tokenId);
      }
    };
    delayed();
  }, [isFinishedDelay, setFinishedDelay, tokenId, index]);

  return isFinishedDelay && isLoadedImage && metadata && metadata.image ? (
    <Image
      boxSize={itemSize}
      alt={alt}
      title={title}
      loading={loading}
      src={src}
    />
  ) : (
    <Flex height={itemSize} width={itemSize}></Flex>
  );
};
export default DelayedImage;
