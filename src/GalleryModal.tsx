import { useState, useEffect } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  Image,
  Flex
} from "@chakra-ui/react";

const GalleryModal = ({ tokenId, imgUrl, onClose }: GalleryModalProps) => {
  useEffect(() => {
    resize();
    window.addEventListener("resize", () => {
      resize();
    });

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, []);

  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  const [dimension, setDimension] = useState("width");

  const resize = () => {
    if (window.innerWidth > window.innerHeight) {
      setDimension("height");
    } else {
      setDimension("width");
    }
    setWindowSize({
      height: window.innerHeight,
      width: window.innerWidth
    });
  };

  return (
    <Modal
      isOpen={tokenId !== null}
      onClose={onClose}
      closeOnOverlayClick
      motionPreset="none"
      size={"full"}
    >
      <ModalOverlay />
      <ModalContent margin="0" bg="rgba(0,0,0,0.5)">
        <ModalBody
          display="flex"
          justifyContent="center"
          onClick={e => {
            const element = e.target as HTMLElement;
            if (
              element.classList.contains("chakra-modal__body") ||
              element.classList.contains("image-container")
            ) {
              onClose();
            }
          }}
        >
          <Flex
            height=""
            justify="center"
            align="center"
            className="image-container"
          >
            <Image
              maxWidth="none"
              height={
                dimension === "height"
                  ? `calc(${windowSize.height}px - 50px)`
                  : "auto"
              }
              width={dimension === "width" ? "calc(100vw - 50px)" : "auto"}
              objectFit="cover"
              src={imgUrl}
            />
          </Flex>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export interface GalleryModalProps {
  tokenId: number;
  imgUrl: string;
  onClose: () => any;
}
export default GalleryModal;
