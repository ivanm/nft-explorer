import { createRef } from "react";
import { Box } from "@chakra-ui/react";

import "./App.css";

import Gallery from "./Gallery";
import Header from "./Header";
import Navigator from "./Navigator";

const App = () => {
  const listRef = createRef();
  return (
    <Box pr="90px">
      <Navigator listRef={listRef} />
      <Header />
      <Box as="main" pt="10px">
        <Gallery listRef={listRef} />
      </Box>
    </Box>
  );
};

export default App;
