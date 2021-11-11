import { Box } from "@chakra-ui/react";

import "./App.css";

import Gallery from "./Gallery";
import Header from "./Header";
import Navigator from "./Navigator";

const App = () => {
  return (
    <Box>
      <Navigator/>
      <Header />
      <Box as="main" pt="10px">
        <Gallery />
      </Box>
    </Box>
  );
};

export default App;
