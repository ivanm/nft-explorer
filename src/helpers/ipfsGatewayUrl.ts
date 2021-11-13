import cids from "cids";
const ipfsGatewayUrl = (uri: string, ipfsGateway: string): string => {
  const hash = uri.slice(7);
  switch (ipfsGateway) {
    case "cloudflare-ipfs.com":
    case "gateway.pinata.cloud":
    case "ipfs.io":
    case "gateway.ipfs.io":
    case "ravencoinipfs-gateway.com":
      return `https://${ipfsGateway}/ipfs/${hash}`;
    case "dweb.link":
    case "infura-ipfs.io":
      const splitHash = hash.split("/");
      const transformedHash = new cids(splitHash[0]).toV1().toString("base32");
      return `https://${transformedHash}.ipfs.${ipfsGateway}${
        splitHash[1] ? `/${splitHash[1]}` : ""
      }`;
  }
  return uri;
};
export default ipfsGatewayUrl;
