import { ArrowDownUp, History, Wallet, Copy, LogOut, RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit';
import { ConnectButton as SuiConnectButton, useCurrentAccount, useDisconnectWallet, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { useAccount, useDisconnect, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, pad, formatUnits, type Hex } from 'viem';
import { SURGE_BRIDGE_EXECUTOR_ADDRESS, SURGE_BRIDGE_EXECUTOR_ABI, ERC20_ABI, WORMHOLE_ABI, SURGE_TOKEN_ADDRESS, WORMHOLE_CORE_ADDRESS } from './config/contracts';
import { lock } from './sui_contract';
import { callBridgeAPI, checkBackendHealth } from './config/backend';
import { networkConfig } from './suiNetworkConfig';


interface WalletMenuProps {
  address: string;
  displayAddress: string;
  onDisconnect: () => void;
}

function WalletMenu({ address, displayAddress, onDisconnect }: WalletMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    setIsOpen(false);
  };

  const handleDisconnect = () => {
    onDisconnect();
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        className="flex items-center gap-2 px-2 py-1 rounded-md bg-black/20 text-xs text-gray-300 hover:bg-black/40 cursor-pointer transition-colors"
      >
        <Wallet className="w-3 h-3" />
        <span>{displayAddress}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-40 bg-[#2b2b33] rounded-xl shadow-xl border border-white/5 py-1 z-50 overflow-hidden">
          <button
            onClick={copyAddress}
            className="w-full px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-white/5 flex items-center gap-2 text-left transition-colors"
          >
            <Copy className="w-3 h-3" />
            Copy address
          </button>
          <button
            onClick={handleDisconnect}
            className="w-full px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-white/5 flex items-center gap-2 text-left transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Change wallet
          </button>
          <div className="h-[1px] bg-white/5 my-1" />
          <button
            onClick={handleDisconnect}
            className="w-full px-3 py-2 text-xs text-red-400 hover:bg-white/5 flex items-center gap-2 text-left transition-colors"
          >
            <LogOut className="w-3 h-3" />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

function SuiWalletSection() {
  const currentAccount = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();

  if (!currentAccount) {
    return (
      <div className="sui-connect-wrapper">
        <SuiConnectButton />
      </div>
    );
  }

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <WalletMenu
      address={currentAccount.address}
      displayAddress={formatAddress(currentAccount.address)}
      onDisconnect={() => disconnect()}
    />
  );
}

// Component to handle wallet connection logic regardless of placement
function ChainWalletConnect({ chainType }: { chainType: string }) {
  const { disconnect } = useDisconnect();

  if (chainType === 'BSC') {
    return (
      <RainbowConnectButton.Custom>
        {({
          account,
          chain,
          openChainModal,
          openConnectModal,
          authenticationStatus,
          mounted,
        }) => {
          const ready = mounted && authenticationStatus !== 'loading';
          const connected =
            ready &&
            account &&
            chain &&
            (!authenticationStatus ||
              authenticationStatus === 'authenticated');

          return (
            <div
              {...(!ready && {
                'aria-hidden': true,
                'style': {
                  opacity: 0,
                  pointerEvents: 'none',
                  userSelect: 'none',
                },
              })}
            >
              {(() => {
                if (!connected) {
                  return (
                    <button onClick={openConnectModal} type="button" className="flex items-center gap-2 px-2 py-1 rounded-md bg-black/20 text-xs text-gray-300 hover:bg-black/40 cursor-pointer transition-colors">
                      <Wallet className="w-3 h-3" />
                      <span>Connect Wallet</span>
                    </button>
                  );
                }

                if (chain.unsupported) {
                  return (
                    <button onClick={openChainModal} type="button" className="text-xs text-red-500">
                      Wrong network
                    </button>
                  );
                }

                return (
                  <WalletMenu
                    address={account.address}
                    displayAddress={account.displayName}
                    onDisconnect={() => disconnect()}
                  />
                );
              })()}
            </div>
          );
        }}
      </RainbowConnectButton.Custom>
    )
  } else {
    return <SuiWalletSection />
  }
}

function App() {
  const [sourceChain, setSourceChain] = useState('BSC');
  const [destChain, setDestChain] = useState('Sui');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [txStatus, setTxStatus] = useState('');
  const [backendOnline, setBackendOnline] = useState(true);
  const [bridgeResult, setBridgeResult] = useState<{
    sourceTxHash: string;
    targetTxHash: string;
    targetChain: string;
    explorerUrl: string;
  } | null>(null);

  const { address: bscAddress } = useAccount();
  const suiAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  // 检查后端服务器状态
  useEffect(() => {
    const checkBackend = async () => {
      const isOnline = await checkBackendHealth();
      setBackendOnline(isOnline);
    };
    
    checkBackend();
    const interval = setInterval(checkBackend, 30000); // 每 30 秒检查一次
    
    return () => clearInterval(interval);
  }, []);

  // Contracts
  const { data: minFee } = useReadContract({
    address: SURGE_BRIDGE_EXECUTOR_ADDRESS,
    abi: SURGE_BRIDGE_EXECUTOR_ABI,
    functionName: 'minFee',
  });

  const { data: messageFee } = useReadContract({
    address: WORMHOLE_CORE_ADDRESS,
    abi: WORMHOLE_ABI,
    functionName: 'messageFee',
  });

  const { data: decimals } = useReadContract({
    address: SURGE_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'decimals',
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: SURGE_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: bscAddress && SURGE_BRIDGE_EXECUTOR_ADDRESS ? [bscAddress, SURGE_BRIDGE_EXECUTOR_ADDRESS] : undefined,
    query: { enabled: !!bscAddress }
  });

  const { data: balance, refetch: refetchBscBalance } = useReadContract({
    address: SURGE_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: bscAddress ? [bscAddress] : undefined,
    query: { enabled: !!bscAddress && sourceChain === 'BSC' }
  });

  // Fetch Sui Balance
  const [suiBalance, setSuiBalance] = useState<string>('0');

  useEffect(() => {
    const fetchSuiBalance = async () => {
      if (suiAccount && suiClient && sourceChain === 'Sui') {
        try {
          const surgeCoinType = `${networkConfig.testnet.packageId}::surge::SURGE`;
          const { totalBalance } = await suiClient.getBalance({
            owner: suiAccount.address,
            coinType: surgeCoinType
          });
          // Assume 9 decimals for Sui SURGE (standard Move decimals usually 9, check your Move code)
          // If your move code uses 9, use 9. If 18, use 18.
          // Let's assume 9 for now as standard SUI token, but if it's bridged from BSC(18), it might be 8 or other.
          // Standard Wormhole wrapped tokens often preserve decimals or cap at 8.
          // Let's assume 9 for now based on common Sui standards, OR 18 if you implemented it that way.
          // Based on `balance: 1000000000000` in your tests, it looks like standard.
          // Let's format it simply.
          setSuiBalance(totalBalance);
        } catch (e) {
          console.error("Failed to fetch Sui balance", e);
          setSuiBalance('0');
        }
      }
    };

    fetchSuiBalance();
    // Set interval to refresh or just depend on chain switch
    const interval = setInterval(fetchSuiBalance, 10000);
    return () => clearInterval(interval);
  }, [suiAccount, suiClient, sourceChain]);

  const { writeContractAsync } = useWriteContract();

  const handleSwapChains = () => {
    setSourceChain(destChain);
    setDestChain(sourceChain);
  };

  const getChainName = (chain: string) => {
    if (chain === 'BSC') return 'BSC Testnet';
    if (chain === 'Sui') return 'Sui Testnet';
    return chain;
  }

  const handleBridge = async () => {
    const amountNum = parseFloat(amount);
    
    if (!amount || isNaN(amountNum) || amountNum <= 0 || !bscAddress || !suiAccount) {
      alert('Please connect wallets and enter a valid amount');
      return;
    }

    if (messageFee === undefined || minFee === undefined) {
      alert('Contract data not loaded yet');
      return;
    }

    setIsLoading(true);
    setTxStatus('Processing...');

    try {
      if (sourceChain === 'BSC') {
        const amountWei = parseUnits(amount, decimals || 9);

        // Check Allowance
        if (!allowance || allowance < amountWei) {
          setTxStatus('Approving...');
          const approveTx = await writeContractAsync({
            address: SURGE_TOKEN_ADDRESS,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [SURGE_BRIDGE_EXECUTOR_ADDRESS, amountWei]
          });
          // We ideally should wait for receipt here, but for simplicity we proceed or could add a wait
          console.log('Approve tx:', approveTx);

          setTxStatus('Waiting for approval...');
          // NOTE: properly waiting requires the hash which we have. 
          // But we can't call useWaitForTransactionReceipt dynamically here easily without effect.
          // For this demo, I'll just assume the user might need to confirm two transactions or I just fire the second one.
          // However, firing second immediately usually fails due to nonce or allowance not updated on node.

          alert("Please wait for Approval transaction to confirm, then click Confirm again.");
          setIsLoading(false);
          refetchAllowance();
          return;
        }

        // Initiate Transfer
        setTxStatus('Initiating Transfer...');
        const targetAddressBytes32 = pad(suiAccount.address as Hex, { size: 32 });
        const totalFee = (messageFee || 0n) + (minFee || 0n);

        const tx = await writeContractAsync({
          address: SURGE_BRIDGE_EXECUTOR_ADDRESS,
          abi: SURGE_BRIDGE_EXECUTOR_ABI,
          functionName: 'initiateTransfer',
          args: [amountWei, targetAddressBytes32, 21], // 21 = Sui
          value: totalFee
        });

        console.log('Bridge tx:', tx);
        setTxStatus('等待 VAA 生成并在 Sui 上执行 unlock...');

        // 调用后端接口处理跨链
        try {
          const result = await callBridgeAPI(tx);
          
          if (result.success && result.data) {
            setTxStatus('跨链成功!');
            setBridgeResult({
              sourceTxHash: result.data.sourceTxHash,
              targetTxHash: result.data.targetTxHash,
              targetChain: result.data.targetChain,
              explorerUrl: result.data.explorerUrl
            });
            alert(`跨链成功!\n源交易: ${tx}\n目标交易: ${result.data.targetTxHash}\n\n查看详情: ${result.data.explorerUrl}`);
            setAmount('');
            refetchBscBalance();
          } else {
            throw new Error(result.error || '后端处理失败');
          }
        } catch (e: any) {
          console.error('Backend bridge failed:', e);
          setTxStatus('后端处理失败');
          alert(`跨链失败: ${e.message}\n\n源交易已提交: ${tx}\n您可以稍后手动重试`);
        }
      } else {
        // Sui -> BSC (Call lock/burn)
        setTxStatus('Initiating Transfer on Sui...');

        if (!bscAddress) {
          alert("Please connect BSC wallet as recipient");
          setIsLoading(false);
          return;
        }

        // Convert BSC address to bytes array for Move vector<u8>
        // remove 0x, then parse pairs of hex chars
        const recipientBytes = bscAddress.slice(2).match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || [];

        const tx = await lock(suiAccount.address, amountNum, recipientBytes);

        signAndExecuteTransaction(
          {
            transaction: tx,
          },
          {
            onSuccess: async (result) => {
              console.log('Sui Bridge tx:', result);
              setTxStatus('等待 VAA 生成并在 BSC 上执行 completeTransfer...');

              // 调用后端接口处理跨链
              try {
                const bridgeResult = await callBridgeAPI(result.digest);
                
                if (bridgeResult.success && bridgeResult.data) {
                  setTxStatus('跨链成功!');
                  setBridgeResult({
                    sourceTxHash: bridgeResult.data.sourceTxHash,
                    targetTxHash: bridgeResult.data.targetTxHash,
                    targetChain: bridgeResult.data.targetChain,
                    explorerUrl: bridgeResult.data.explorerUrl
                  });
                  alert(`跨链成功!\n源交易: ${result.digest}\n目标交易: ${bridgeResult.data.targetTxHash}\n\n查看详情: ${bridgeResult.data.explorerUrl}`);
                  setAmount('');
                } else {
                  throw new Error(bridgeResult.error || '后端处理失败');
                }
              } catch (e: any) {
                console.error('Backend bridge failed:', e);
                setTxStatus('后端处理失败');
                alert(`跨链失败: ${e.message}\n\n源交易已提交: ${result.digest}\n您可以稍后手动重试`);
              } finally {
                setIsLoading(false);
              }
            },
            onError: (err) => {
              console.error('Sui Bridge failed', err);
              setTxStatus('Failed');
              alert('Transaction failed');
              setIsLoading(false);
            }
          }
        );
      }
    } catch (err: any) {
      console.error(err);
      setTxStatus('Error');
      alert(err.message || 'Transaction failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Display Balance Logic
  const displayBalance = sourceChain === 'BSC'
    ? (balance && decimals ? formatUnits(balance, decimals) : '0')
    : (formatUnits(BigInt(suiBalance), 9)); // Assuming 9 decimals for Sui SURGE, change to 18 if your move contract uses 18

  // Loading Overlay Component
  const LoadingOverlay = () => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-white p-4">
      <Loader2 className="w-16 h-16 text-[#6366f1] animate-spin mb-4" />
      <h2 className="text-2xl font-bold mb-2">Processing Transaction</h2>
      <p className="text-gray-300 text-center max-w-md animate-pulse">{txStatus}</p>
      <div className="mt-8 text-xs text-gray-500">Please do not close this window</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020205] text-white flex items-center justify-center p-4 font-sans">
      {isLoading && <LoadingOverlay />}
      
      <div className="w-full max-w-[480px] bg-[#0f1014] p-6 rounded-3xl border border-white/5 shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-xl font-semibold tracking-wide">Wormhole Connect</h1>
          <div className="flex items-center gap-3">
            {/* Backend Status */}
            <div className="flex items-center gap-1.5">
              {backendOnline ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-gray-400">Backend Online</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-xs text-red-400">Backend Offline</span>
                </>
              )}
            </div>
            <button className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-white">
              <History className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Card */}
        <div className="space-y-2">

          {/* From Section */}
          <div className="bg-[#1b1b22] rounded-2xl p-4 space-y-3 border border-white/5 hover:border-white/10 transition-colors">
            <div className="flex justify-between text-sm text-gray-400 px-1">
              <span>From</span>
              {/* Wallet Connection Button */}
              <div className="flex items-center">
                <ChainWalletConnect chainType={sourceChain} />
              </div>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#F3BA2F] flex items-center justify-center text-black shadow-lg ring-2 ring-transparent group-hover:ring-[#F3BA2F]/20 transition-all">
                  {sourceChain === 'BSC' ? (
                    <svg viewBox="0 0 32 32" className="w-6 h-6"><path d="M16 32C7.163 32 0 24.837 0 16S7.163 0 16 0s16 7.163 16 16-7.163 16-16 16zm-3.884-17.596L16 10.52l3.886 3.886 2.26-2.26L16 6l-6.144 6.144 2.26 2.26zM6 16l2.26 2.26L10.52 16l-2.26-2.26L6 16zm6.116 1.596l-2.263 2.257L16 26l6.146-6.146-2.26-2.26L16 21.48l-3.884-3.884zM26 16l-2.26-2.26L21.48 16l2.26 2.26L26 16z" fill="white"></path></svg>
                  ) : (
                    <span className="font-bold text-lg">S</span>
                  )}
                </div>
                <div className="text-left">
                  <div className="font-semibold text-lg leading-tight">{sourceChain}</div>
                  <div className="text-xs text-gray-500 font-medium tracking-wide">{getChainName(sourceChain)}</div>
                </div>
              </div>
              <div className="text-gray-500 group-hover:text-white transition-colors">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="m6 9 6 6 6-6" /></svg>
              </div>
            </div>
          </div>

          {/* Swap Button */}
          <div className="relative h-4 flex items-center justify-center z-10">
            <button
              onClick={handleSwapChains}
              className="bg-[#2b2b33] p-2 rounded-lg border-4 border-[#0f1014] text-gray-400 hover:text-white hover:bg-[#3f3f46] transition-all transform hover:scale-110 hover:shadow-xl"
            >
              <ArrowDownUp className="w-4 h-4" />
            </button>
          </div>

          {/* To Section */}
          <div className="bg-[#1b1b22] rounded-2xl p-4 space-y-3 border border-white/5 hover:border-white/10 transition-colors">
            <div className="flex justify-between text-sm text-gray-400 px-1">
              <span>To</span>
              {/* Dest Wallet Connection Button */}
              <div className="flex items-center">
                <ChainWalletConnect chainType={destChain} />
              </div>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#3b82f6] flex items-center justify-center text-white shadow-lg ring-2 ring-transparent group-hover:ring-[#3b82f6]/20 transition-all">
                  {destChain === 'BSC' ? (
                    <svg viewBox="0 0 32 32" className="w-6 h-6"><path d="M16 32C7.163 32 0 24.837 0 16S7.163 0 16 0s16 7.163 16 16-7.163 16-16 16zm-3.884-17.596L16 10.52l3.886 3.886 2.26-2.26L16 6l-6.144 6.144 2.26 2.26zM6 16l2.26 2.26L10.52 16l-2.26-2.26L6 16zm6.116 1.596l-2.263 2.257L16 26l6.146-6.146-2.26-2.26L16 21.48l-3.884-3.884zM26 16l-2.26-2.26L21.48 16l2.26 2.26L26 16z" fill="white"></path></svg>
                  ) : (
                    <span className="font-bold text-lg">S</span>
                  )}
                </div>
                <div className="text-left">
                  <div className="font-semibold text-lg leading-tight">{destChain}</div>
                  <div className="text-xs text-gray-500 font-medium tracking-wide">{getChainName(destChain)}</div>
                </div>
              </div>
              <div className="text-gray-500 group-hover:text-white transition-colors">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="m6 9 6 6 6-6" /></svg>
              </div>
            </div>
          </div>

          {/* Amount Section */}
          <div className="bg-[#1b1b22] rounded-2xl p-4 space-y-4 mt-2 border border-white/5">
            <div className="flex justify-between text-sm text-gray-400 px-1">
              <span>Amount</span>
              <span>Balance: {displayBalance}</span>
            </div>
            <div className="flex items-center justify-between gap-4 bg-[#111114] p-3 rounded-xl border border-white/5 focus-within:border-indigo-500/50 transition-colors">
              <input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={(e) => {
                  const value = e.target.value;
                  // 只允许数字和小数点
                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                    setAmount(value);
                  }
                }}
                className="bg-transparent text-2xl font-medium outline-none w-full placeholder-gray-600"
              />
              <div className="flex items-center gap-2 bg-[#1b1b22] px-3 py-1.5 rounded-full cursor-pointer hover:bg-[#27272e] transition-colors border border-white/5">
                <div className="w-5 h-5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                <span className="font-medium text-sm">SURGE</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-gray-400"><path d="m6 9 6 6 6-6" /></svg>
              </div>
            </div>
            <div className="flex justify-between items-center px-1">
              <div className="text-xs text-gray-500">
                {messageFee ? `Est. Fee: ${formatUnits(messageFee + (minFee || 0n), 18)} BNB` : 'Loading fee...'}
              </div>
              <button
                onClick={() => setAmount(displayBalance)}
                className="text-xs font-medium bg-[#2b2b33] hover:bg-[#3f3f46] text-white px-3 py-1 rounded-full transition-colors"
              >
                Max
              </button>
            </div>
          </div>

          {/* Bridge Result */}
          {bridgeResult && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mt-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-green-400 font-semibold">跨链成功!</span>
              </div>
              <div className="space-y-1 text-xs text-gray-300">
                <div>源交易: {bridgeResult.sourceTxHash.slice(0, 10)}...</div>
                <div>目标交易: {bridgeResult.targetTxHash.slice(0, 10)}...</div>
                <a 
                  href={bridgeResult.explorerUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline block mt-2"
                >
                  在 {bridgeResult.targetChain} 浏览器中查看 →
                </a>
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleBridge}
            disabled={isLoading || !amount || parseFloat(amount) <= 0 || isNaN(parseFloat(amount)) || !backendOnline}
            className="w-full bg-[#6366f1] hover:bg-[#5558e3] text-white py-4 rounded-xl font-semibold mt-6 transition-all shadow-[0_0_20px_-5px_rgba(99,102,241,0.4)] hover:shadow-[0_0_25px_-5px_rgba(99,102,241,0.6)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? txStatus : !backendOnline ? '后端服务离线' : 'Confirm transaction'}
          </button>

          <div className="flex justify-center items-center gap-2 text-xs text-gray-500 mt-4">
            <span>Powered by</span>
            <span className="font-bold text-white tracking-wider">WORMHOLE</span>
          </div>

        </div>

        <div className="flex justify-between text-xs text-gray-500 mt-8 px-2 font-medium">
          <button className="hover:text-white transition-colors">Resume Transaction</button>
          <button className="hover:text-white transition-colors">Terms of Service</button>
        </div>
      </div>
    </div>
  );
}

export default App;
