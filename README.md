### NFT Explorer

https://ivanm.github.io/nft-explorer/

Visualize ERC721 NFT Collections directly from the blockchain. An alternative to OpenSea/Rarible, etc.

![screenshot](https://raw.githubusercontent.com/ivanm/nft-explorer/main/misc/screenshot1.png)

## Features:

- User can browse big collections (9,999+ of items) on a single table.
- Navigation on the right side makes easier to find out the position withinn the table.
- Only the data that is visualized is the ony data that is rendered. (Thanks to https://github.com/bvaughn/react-window !)
- Metadata download and image download is also generated only when the user is visualizing the current item.
- Localstorage is used for caching the data from the blockchain and the data from the APIs to avoid unescesary calls.
- Uses an optional CORS Proxy for full compatibility.
- User can use the IPFS Gateway they prefer.

## Options

### CORS Proxy

Not al APIs add the correct CORS Headers, so an optional CORS Proxy can be used. Tested with https://github.com/Glifery/cors-proxy and https://github.com/Rob--W/cors-anywhere

### IPFS Gateway

The Gateway for IPFS can be selected on the options, please refer to https://ipfs.github.io/public-gateway-checker/ for reference on the status.

## Under the hood

- TypeScript
- React
- Redux
- Chakra UI 
- useDapp
