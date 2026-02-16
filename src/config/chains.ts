import { defineChain } from 'viem'

// Get RPC URL from environment variable with fallback
const MONAD_RPC_URL = import.meta.env.VITE_MONAD_RPC_URL || 
  'https://monad-mainnet.api.onfinality.io/public'

// TODO: verify Monad mainnet chain ID before production deployment
export const monad = defineChain({
  id: 143,
  name: 'Monad',
  nativeCurrency: {
    decimals: 18,
    name: 'MON',
    symbol: 'MON',
  },
  rpcUrls: {
    default: {
      http: [MONAD_RPC_URL],
    },
  },
  blockExplorers: {
    default: {
      name: 'Monad Explorer',
      url: 'https://monadvision.com/',
    },
  },
})
