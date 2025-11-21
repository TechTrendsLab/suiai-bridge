import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { bscTestnet } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Surge Bridge',
  // ⚠️ 重要：请替换为您自己的 WalletConnect Project ID
  // 可以在 https://cloud.walletconnect.com 免费申请
  projectId: '3a8170812b534d0ff9d794f19a901d64', // 这里提供一个临时的公共测试 ID，如果不稳定请替换为您自己的
  chains: [bscTestnet],
  ssr: true, // If your dApp uses server side rendering (SSR)
});

