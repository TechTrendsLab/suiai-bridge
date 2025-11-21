import { getFullnodeUrl } from "@mysten/sui/client";
import { createNetworkConfig } from "@mysten/dapp-kit";

const { networkConfig, useNetworkVariable, useNetworkVariables } =
  createNetworkConfig({
    devnet: {
      url: getFullnodeUrl("devnet"),
    },
    testnet: {
      url: getFullnodeUrl("testnet"),
      packageId: "0x00da184f41d1d9893ed82ae6d3bfbfa5e00d797bb3b6de8257a8967063d1a57d",
      surgeState:"0x197b67a3ba45276868494b666e60a26c69507d61c9af57956592112dc2efe908",
      ACL:"0xaca83e779928e52428cb75f4e7d9fae0389f4786687629f84d34d2a2c5d865cc",
      superAdmin:"0x0f6a5914beaeea6e8f4f126aa5b3368493e02ab3a1d50f75d4be124b6709fe16",
      treasuryCap:"0xaf516a53a6d6773574bd8a9ce4655ce6d895711859a587d249d9d96a5fed76ae",
      state:"0x31358d198147da50db32eda2562951d53973a0c0ad5ed738e9b17d88b213d790",
      bridgeState:"0x205a2a17a6c2dea637b05af597cbd4eeaa61ad8d1db7bb61bbf8e63cacce41fc"
    },
    mainnet: {
      url: getFullnodeUrl("mainnet"),
    },
  });

export { useNetworkVariable, useNetworkVariables, networkConfig };
