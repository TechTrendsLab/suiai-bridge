import { ArrowDownUp, History, Wallet, Copy, LogOut, RefreshCw } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit';
import { ConnectButton as SuiConnectButton, useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit';
import { useDisconnect } from 'wagmi';

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

  const handleSwapChains = () => {
    setSourceChain(destChain);
    setDestChain(sourceChain);
  };

  const getChainName = (chain: string) => {
    if (chain === 'BSC') return 'BSC Testnet';
    if (chain === 'Sui') return 'Sui Testnet';
    return chain;
  }

  return (
    <div className="min-h-screen bg-[#020205] text-white flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-[480px] bg-[#0f1014] p-6 rounded-3xl border border-white/5 shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-xl font-semibold tracking-wide">Wormhole Connect</h1>
          <button className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-white">
            <History className="w-5 h-5" />
          </button>
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
              <span>Balance: 0</span>
            </div>
            <div className="flex items-center justify-between gap-4 bg-[#111114] p-3 rounded-xl border border-white/5 focus-within:border-indigo-500/50 transition-colors">
              <input
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
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
                Max: 0 SURGE
              </div>
              <button className="text-xs font-medium bg-[#2b2b33] hover:bg-[#3f3f46] text-white px-3 py-1 rounded-full transition-colors">Max</button>
            </div>
          </div>

          {/* Action Button */}
          <button className="w-full bg-[#6366f1] hover:bg-[#5558e3] text-white py-4 rounded-xl font-semibold mt-6 transition-all shadow-[0_0_20px_-5px_rgba(99,102,241,0.4)] hover:shadow-[0_0_25px_-5px_rgba(99,102,241,0.6)] disabled:opacity-50 disabled:cursor-not-allowed">
            Confirm transaction
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
