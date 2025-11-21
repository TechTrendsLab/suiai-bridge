// Replace with your deployed contract address
export const SURGE_BRIDGE_EXECUTOR_ADDRESS = "0xED23281b0902AA40C53154dFeEA277F38070782e";
export const SURGE_TOKEN_ADDRESS = "0xF7E3F882D0CdECFF0AC45A07B2879D6aa770f4c7";
export const WORMHOLE_CORE_ADDRESS = "0x68605AD7b15c732a30b1BbC62BE8F2A509D74b4D";

export const SURGE_BRIDGE_EXECUTOR_ABI = [
    {
        "inputs": [],
        "name": "surge",
        "outputs": [
            {
                "internalType": "contract Surge",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "wormhole",
        "outputs": [
            {
                "internalType": "contract IWormholeCore",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "minFee",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            },
            {
                "internalType": "bytes32",
                "name": "targetAddress",
                "type": "bytes32"
            },
            {
                "internalType": "uint16",
                "name": "targetChain",
                "type": "uint16"
            }
        ],
        "name": "initiateTransfer",
        "outputs": [
            {
                "internalType": "uint64",
                "name": "sequence",
                "type": "uint64"
            }
        ],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "sender",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            },
            {
                "indexed": true,
                "internalType": "uint16",
                "name": "targetChain",
                "type": "uint16"
            },
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "targetAddress",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "uint64",
                "name": "sequence",
                "type": "uint64"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "feeTaken",
                "type": "uint256"
            }
        ],
        "name": "TransferInitiated",
        "type": "event"
    }
] as const;

export const ERC20_ABI = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "owner",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "spender",
                "type": "address"
            }
        ],
        "name": "allowance",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "spender",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "approve",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            }
        ],
        "name": "balanceOf",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "decimals",
        "outputs": [
            {
                "internalType": "uint8",
                "name": "",
                "type": "uint8"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
] as const;

export const WORMHOLE_ABI = [
    {
        "inputs": [],
        "name": "messageFee",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
] as const;

