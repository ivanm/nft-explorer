import React from "react";
import ReactDOM from "react-dom";
import { ChakraProvider } from "@chakra-ui/react";

import "./index.css";
import App from "./App";
// import reportWebVitals from "./reportWebVitals";
import { DAppProvider } from "@usedapp/core";
import { ColorModeScript } from "@chakra-ui/react";
import theme from "./theme";
import { configChainId, alchemyApi } from "./constants";
import store from "./redux/store";
import { Provider } from "react-redux";

const config = {
  readOnlyChainId: configChainId,
  readOnlyUrls: {
    [configChainId]: alchemyApi
  }
};

ReactDOM.render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <DAppProvider config={config}>
        <ColorModeScript initialColorMode={theme.config.initialColorMode} />
        <Provider store={store}>
          <App />
        </Provider>
      </DAppProvider>
    </ChakraProvider>
  </React.StrictMode>,
  document.getElementById("root")
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals(console.log);
