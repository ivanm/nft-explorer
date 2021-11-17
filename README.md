### NFT Explorer

https://nft-explorer.vaan.dev/

Visualize ERC721 NFT Collections directly from the blockchain. An alternative to OpenSea/Rarible, etc.

![screenshot](https://raw.githubusercontent.com/ivanm/nft-explorer/main/misc/screenshot1.png)

## Features:

- Browse big collections (9,999+ of items) on a single page.
- Navigation on the right side makes easier to find the position within the table and the remaining items on the list.
- Only the data that is visualized is the data that is rendered. (Thanks to https://github.com/bvaughn/react-window !)
- Metadata and image download is also triggered only when the user is visualizing the current items to save bandwidth and improve loading times.
- All the data is cached in localstorage to avoid unnecessary calls to the APIs and blockchain.
- Optional CORS Proxy for full compatibility.
- IPFS Gateway can be selected from a public server list. 

## Options

### CORS Proxy

Not all APIs add the correct CORS Headers to their requests, so an optional CORS Proxy can be used.

Tested with:
- https://github.com/Glifery/cors-proxy
- https://github.com/Rob--W/cors-anywhere

### IPFS Gateway

The Gateway for IPFS can be selected on the options, please refer to https://ipfs.github.io/public-gateway-checker/ for reference on the current status and connection speed.

## Run locally

- Clone this repo
- Run `yarn install` to install dependencies.
- Run `yarn start` to deploy local server.

## Under the hood

- React 17
- TypeScript 
- React Window
- Redux
- Chakra UI 
- useDapp
