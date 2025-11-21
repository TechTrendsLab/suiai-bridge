import { getFullnodeUrl } from "@mysten/sui/client";
import { createNetworkConfig } from "@mysten/dapp-kit";

const { networkConfig, useNetworkVariable, useNetworkVariables } =
  createNetworkConfig({
    devnet: {
      url: getFullnodeUrl("devnet"),
    },
    testnet: {
      url: getFullnodeUrl("testnet"),
      packageId: "0xb1ef5fb760a44fc8783437985b4295dc8ac4db4a07a1b90c2fc01c53115cd347",
      surgeState:"0x197b67a3ba45276868494b666e60a26c69507d61c9af57956592112dc2efe908",
      ACL:"0xa46311146098fcd702643c9cba4ff058bdd57abc8822ece5731ac5be7ecfce8a",
      superAdmin:"0x98c6b66efc22158ec1a939c911c2fb1bee9f27cd81f39cd666c6405da15ebe02",
      treasuryCap:"0xe4e71b7572a6cce6953ca783149044884928a0ef3fb6f316048cbfc92fa4f0ff",
      state:"0x31358d198147da50db32eda2562951d53973a0c0ad5ed738e9b17d88b213d790",
      bridgeState:"0x61d9dbd5b4091ca45c9ede2dbcb1bd88469e870f1aaa2de2d9ce98036519b43f"
    },
    mainnet: {
      url: getFullnodeUrl("mainnet"),
    },
  });

export { useNetworkVariable, useNetworkVariables, networkConfig };
