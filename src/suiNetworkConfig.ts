import { getFullnodeUrl } from "@mysten/sui/client";
import { createNetworkConfig } from "@mysten/dapp-kit";

const { networkConfig, useNetworkVariable, useNetworkVariables } =
  createNetworkConfig({
    devnet: {
      url: getFullnodeUrl("devnet"),
    },
    testnet: {
      url: getFullnodeUrl("testnet"),
      packageId: "0xa85bf1df86ac7eccb503f51a5b40f1fab94ef0788f6d9fe605a04c032ff07d78",
      ACL:"0x6a043de9ca6875fb94dc20f5f567725717191eacdb7b4c6345ba96ca710905f3",
      superAdmin:"0x77b1fd81c2f9cc3a92574244c76a35f4e4bacdcac75619709d3f8729ad497161",
      treasuryCap:"0x47f95dc88a2c2f452f5ba713c61d8af7fbf524004f820e5d8fe67102b53b6202",
      state:"0x31358d198147da50db32eda2562951d53973a0c0ad5ed738e9b17d88b213d790",
      bridgeState:"0x73d5c13821558903002f37f4e267cb814f5a606a749d7dbb1ad7ec823b628b9b"
    },
    mainnet: {
      url: getFullnodeUrl("mainnet"),
    },
  });

export { useNetworkVariable, useNetworkVariables, networkConfig };
