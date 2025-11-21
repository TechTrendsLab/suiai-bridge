/**
 * 后端 API 配置
 */
export const BACKEND_CONFIG = {
  // 后端服务器地址
  apiUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001',
  
  // API 端点
  endpoints: {
    bridge: '/api/bridge',  // 统一跨链接口
    health: '/health',      // 健康检查
  },
  
  // 轮询配置
  polling: {
    interval: 5000,  // 5 秒轮询一次
    maxAttempts: 60  // 最多轮询 60 次（5分钟）
  }
} as const;

/**
 * 调用后端跨链接口
 */
export async function callBridgeAPI(txHash: string): Promise<{
  success: boolean;
  message?: string;
  data?: {
    sourceTxHash: string;
    sourceChain: string;
    targetChain: string;
    targetTxHash: string;
    vaaRaw: string;
    explorerUrl: string;
  };
  error?: string;
}> {
  const url = `${BACKEND_CONFIG.apiUrl}${BACKEND_CONFIG.endpoints.bridge}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ txHash })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '后端请求失败');
  }
  
  return response.json();
}

/**
 * 检查后端服务器健康状态
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const url = `${BACKEND_CONFIG.apiUrl}${BACKEND_CONFIG.endpoints.health}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.status === 'ok';
  } catch (error) {
    console.error('后端健康检查失败:', error);
    return false;
  }
}

