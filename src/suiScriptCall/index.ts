import { unlock } from "../sui_contract";
import { networkConfig } from "../suiNetworkConfig";
import { SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";

/**
 * Sui 客户端和私钥配置
 */
let suiClient: SuiClient | null = null;
let keypair: Ed25519Keypair | null = null;
let signerAddress: string = "";

/**
 * Base64 字符串转 Uint8Array
 */
function base64ToUint8ArrayForKey(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * 初始化 Sui 客户端和密钥对
 * @param privateKey Base64 编码的私钥
 */
export function initializeSuiSigner(privateKey: string) {
  try {
    // 创建 Sui 客户端
    suiClient = new SuiClient({ url: networkConfig.testnet.url });

    // 从私钥创建 keypair
    // 将 Base64 私钥转换为 Uint8Array
    const privateKeyBytes = base64ToUint8ArrayForKey(privateKey);
    keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);

    // 获取地址
    signerAddress = keypair.getPublicKey().toSuiAddress();

    console.log("Sui 签名者初始化成功:", signerAddress);

    return {
      address: signerAddress,
      client: suiClient,
    };
  } catch (error) {
    console.error("Sui 签名者初始化失败:", error);
    throw new Error(`初始化失败: ${error}`);
  }
}

/**
 * 获取签名者地址
 */
export function getSignerAddress(): string {
  if (!signerAddress) {
    throw new Error("Sui 签名者未初始化，请先调用 initializeSuiSigner()");
  }
  return signerAddress;
}

/**
 * Wormhole API 响应接口
 */
interface WormholeOperation {
  id: string;
  emitterChain: number;
  emitterAddress: string;
  sequence: string;
  vaa?: {
    raw: string; 
    isDuplicated: boolean;
  };
  data?: {
    parsedPayload?: any;
  };
}

interface WormholeAPIResponse {
  operations: WormholeOperation[];
}

/**
 * VAA 查询状态
 */
export const VAAStatus = {
  PENDING: "pending",       // VAA 尚未生成
  READY: "ready",          // VAA 已就绪
  ERROR: "error",          // 查询错误
  NOT_FOUND: "not_found",  // 交易不存在
} as const;

export type VAAStatus = typeof VAAStatus[keyof typeof VAAStatus];

export interface VAAQueryResult {
  status: VAAStatus;
  vaa?: number[]; // u8 数组
  raw?: string;   // Base64 原始数据
  error?: string;
  retryCount?: number;
}

/**
 * 将 Base64 编码的 VAA 转换为 u8 数组
 */
export function base64ToUint8Array(base64: string): number[] {
  try {
    // 移除可能的空格和换行
    const cleanBase64 = base64.replace(/\s/g, "");
    
    // 使用 atob 解码 Base64
    const binaryString = atob(cleanBase64);
    
    // 转换为 u8 数组
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return Array.from(bytes);
  } catch (error) {
    console.error("Base64 解码失败:", error);
    throw new Error(`VAA Base64 解码失败: ${error}`);
  }
}

/**
 * 查询 VAA（单次）
 */
export async function queryVAA(txHash: string): Promise<VAAQueryResult> {
  try {
    const apiUrl = `https://api.testnet.wormholescan.io/api/v1/operations?txHash=${txHash}`;
    
    console.log(`正在查询 VAA: ${txHash}`);
    
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "accept": "application/json",
      },
    });

    if (!response.ok) {
      return {
        status: VAAStatus.ERROR,
        error: `HTTP 错误: ${response.status} ${response.statusText}`,
      };
    }

    const data: WormholeAPIResponse = await response.json();

    // 检查是否有操作记录
    if (!data.operations || data.operations.length === 0) {
      return {
        status: VAAStatus.NOT_FOUND,
        error: "未找到对应的 Wormhole 操作记录，请确认交易哈希是否正确",
      };
    }

    const operation = data.operations[0];

    // 检查 VAA 是否已生成
    if (!operation.vaa || !operation.vaa.raw) {
      return {
        status: VAAStatus.PENDING,
        error: "VAA 尚未生成，请稍候...",
      };
    }

    // VAA 已就绪，转换为 u8 数组
    const vaaBytes = base64ToUint8Array(operation.vaa.raw);

    console.log(`VAA 查询成功! 长度: ${vaaBytes.length} bytes`);

    return {
      status: VAAStatus.READY,
      vaa: vaaBytes,
      raw: operation.vaa.raw,
    };
  } catch (error) {
    console.error("查询 VAA 失败:", error);
    return {
      status: VAAStatus.ERROR,
      error: `查询失败: ${error}`,
    };
  }
}

/**
 * 轮询查询 VAA（带重试机制）
 * @param txHash 以太坊交易哈希
 * @param maxRetries 最大重试次数（默认 30 次）
 * @param retryDelayMs 重试间隔（毫秒，默认 3000ms）
 * @param onProgress 进度回调
 */
export async function fetchVAAWithRetry(
  txHash: string,
  options?: {
    maxRetries?: number;
    retryDelayMs?: number;
    initialDelayMs?: number;
    onProgress?: (result: VAAQueryResult) => void;
  }
): Promise<VAAQueryResult> {
  const {
    maxRetries = 30,
    retryDelayMs = 3000,
    initialDelayMs = 5000,
    onProgress,
  } = options || {};

  // 初始延迟，等待 Guardian 签名
  console.log(`等待 ${initialDelayMs / 1000} 秒后开始查询 VAA...`);
  await new Promise((resolve) => setTimeout(resolve, initialDelayMs));

  for (let i = 0; i < maxRetries; i++) {
    const result = await queryVAA(txHash);
    result.retryCount = i + 1;

    // 回调进度
    if (onProgress) {
      onProgress(result);
    }

    // VAA 已就绪，返回结果
    if (result.status === VAAStatus.READY) {
      return result;
    }

    // 交易不存在或其他错误，直接返回
    if (result.status === VAAStatus.NOT_FOUND || result.status === VAAStatus.ERROR) {
      return result;
    }

    // VAA 尚未生成，继续重试
    if (i < maxRetries - 1) {
      console.log(`第 ${i + 1}/${maxRetries} 次查询，${retryDelayMs / 1000} 秒后重试...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  // 超过最大重试次数
  return {
    status: VAAStatus.ERROR,
    error: `超过最大重试次数（${maxRetries}），VAA 仍未就绪。请稍后手动重试。`,
    retryCount: maxRetries,
  };
}

/**
 * 签名并执行 Sui 交易
 * @param tx 交易对象
 */
export async function signAndExecuteTransaction(tx: Transaction) {
  if (!suiClient || !keypair) {
    throw new Error("Sui 签名者未初始化，请先调用 initializeSuiSigner()");
  }

  try {
    console.log("准备签名并执行 Sui 交易...", {
      sender: signerAddress,
    });

    // 签名并执行交易
    const result = await suiClient.signAndExecuteTransaction({
      transaction: tx,
      signer: keypair,
      options: {
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
      },
    });

    console.log("Sui 交易已提交:", {
      digest: result.digest,
      status: result.effects?.status?.status,
    });

    // 等待交易确认
    const txResult = await suiClient.waitForTransaction({
      digest: result.digest,
      options: {
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
      },
    });

    if (txResult.effects?.status?.status !== "success") {
      throw new Error(
        `交易执行失败: ${txResult.effects?.status?.error || "未知错误"}`
      );
    }

    console.log("Sui 交易执行成功:", {
      digest: result.digest,
      gasUsed: txResult.effects?.gasUsed,
    });

    return {
      digest: result.digest,
      effects: txResult.effects,
      events: txResult.events,
      objectChanges: txResult.objectChanges,
    };
  } catch (error: any) {
    console.error("Sui 交易执行失败:", error);
    throw new Error(`交易失败: ${error.message || error}`);
  }
}

/**
 * 从以太坊交易哈希解锁 Sui 代币（完整流程 - 自动执行）
 * @param txHash 以太坊交易哈希
 * @param autoExecute 是否自动执行交易（默认 true）
 * @param onProgress 进度回调
 */
export async function unlockFromEthereum(
  txHash: string,
  options?: {
    autoExecute?: boolean;
    onProgress?: (status: string, result?: VAAQueryResult) => void;
  }
) {
  const { autoExecute = true, onProgress } = options || {};

  try {
    // 步骤 1: 查询 VAA
    if (onProgress) onProgress("正在查询 VAA...");

    const vaaResult = await fetchVAAWithRetry(txHash, {
      maxRetries: 30,
      retryDelayMs: 3000,
      initialDelayMs: 5000,
      onProgress: (result) => {
        if (onProgress) {
          onProgress(`查询 VAA 中 (${result.retryCount}/30)...`, result);
        }
      },
    });

    // 检查 VAA 是否成功获取
    if (vaaResult.status !== VAAStatus.READY || !vaaResult.vaa) {
      throw new Error(vaaResult.error || "获取 VAA 失败");
    }

    console.log("VAA 获取成功，长度:", vaaResult.vaa.length);

    // 步骤 2: 创建 Sui unlock 交易
    if (onProgress) onProgress("正在准备 Sui 交易...");

    const tx = await unlock(
      networkConfig.testnet.bridgeState,
      vaaResult.vaa
    );

    console.log("Sui 交易已创建");

    // 步骤 3: 自动执行交易（如果启用）
    if (autoExecute) {
      if (onProgress) onProgress("正在签名并执行 Sui 交易...");

      const txResult = await signAndExecuteTransaction(tx);

      if (onProgress) onProgress("解锁成功!", vaaResult);

      return {
        success: true,
        vaa: vaaResult,
        transaction: {
          digest: txResult.digest,
          effects: txResult.effects,
          events: txResult.events,
          objectChanges: txResult.objectChanges,
        },
      };
    }

    // 仅返回准备好的交易（不执行）
    if (onProgress) onProgress("Sui 交易已准备完成", vaaResult);

    return {
      success: true,
      vaa: vaaResult,
      transaction: tx,
    };
  } catch (error) {
    console.error("解锁流程失败:", error);
    throw error;
  }
}