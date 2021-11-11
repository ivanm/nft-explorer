import { useState, useEffect } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  Image,
  Flex
} from "@chakra-ui/react";

const GalleryModal = ({
  tokenId,
  imgUrl,
  onClose
}: GalleryModalProps) => {
  useEffect(() => {
    resize();
    window.addEventListener("resize", () => {
      resize();
    });

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, []);

  const [, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  const resize = () => {
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
      <ModalContent
        margin="0"
        bg="rgba(0,0,0,0.5)"
        onClick={e => {
          const element = e.target as HTMLElement;
          if (element.classList.contains("image-container")) {
            onClose();
          }
        }}
      >
        <ModalBody>
          <Flex
            height=""
            justify="center"
            align="center"
            className="image-container"
          >
            <Image
              maxWidth="none"
              height="calc(100vh - 50px)"
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
