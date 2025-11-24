import { networkConfig } from "../suiNetworkConfig";
import { Transaction,coinWithBalance } from "@mysten/sui/transactions";
import {SuiClient} from "@mysten/sui/client";

const DEFAULT_FEE_AMOUNT = 10000000;

const suiClient = new SuiClient({
    url: networkConfig.testnet.url,
});

export const querySurgeBalance = async (address: string) => {
    const balance = await suiClient.getBalance({
        owner: address,
        coinType: `${networkConfig.testnet.packageId}::surge::SURGE`,
    });
    console.log("balance", balance);
    return balance;
};

// surge_state: &mut SurgeBridgeState,
// state: &mut State,
// buf: vector<u8>,
// clock: &Clock,
// ctx: &mut TxContext,
export const unlock = async (
    surgeState: string,
    buf: number[],
) => {
    console.log("surgeState", surgeState);
    console.log("buf", buf);
    console.log("networkConfig.testnet.state", networkConfig.testnet.state);
    console.log("networkConfig.testnet.packageId", networkConfig.testnet.packageId);
    const tx = new Transaction();
    tx.moveCall({
        target: `${networkConfig.testnet.packageId}::surge::unlock`,
        arguments: [
            tx.object(networkConfig.testnet.bridgeState),
            tx.object(networkConfig.testnet.state),
            tx.pure.vector("u8", buf),
            tx.object("0x6")
        ],
    });
    return tx;
};

// surge_state: &mut SurgeBridgeState,
// state: &mut State,
// buf: vector<u8>,
// clock: &Clock,
// ctx: &mut TxContext,
export const lock = async (
    address: string,
    amount: bigint,
    recipient: number[],
) => {
    console.log("address", address);
    console.log("amount", amount);
    console.log("recipient", recipient);
    const tx = new Transaction();
    tx.setSender(address);
    // Convert amount to string for coinWithBalance (it accepts string | bigint | number)
    tx.moveCall({
        target: `${networkConfig.testnet.packageId}::surge::lock`,
        arguments: [
            tx.object(networkConfig.testnet.state),
            tx.object(networkConfig.testnet.bridgeState),
            coinWithBalance({type: `${networkConfig.testnet.packageId}::surge::SURGE`, balance: amount}),
            coinWithBalance({type: "0x2::sui::SUI", balance: DEFAULT_FEE_AMOUNT}),
            tx.pure.vector("u8", recipient),
            tx.object("0x6"),
        ],
    });
    return tx;
};