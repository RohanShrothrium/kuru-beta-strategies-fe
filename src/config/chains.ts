import { defineChain } from 'viem'

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
      http: ['https://rpc.monad.fastlane.xyz/eyJhIjoiMHg3NGNlQ2RFOUUzMWI5NjFhNjVEMGExQ2JGNDk0ODM2ZTQ0YTU1YjFhIiwidCI6MTc3MDkyODU5MiwicyI6IjB4YTRiZWFmNjlmZDdmZDEzZTNiY2MyMDBmYzk5Nzk0MjgxYzJjNDJlYTNlNDlhNDNiZDFhY2Y5OTFmYjhiOTNhZjNjNjBjNzFiMmZlYjZiNzNjNGQ0OGQ1MGNjNTM0N2FjYWI4ODJkOWRmMzdhNTUzNWQxNmUyY2E1Y2IzYTU2NjQxYyJ9'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Monad Explorer',
      url: 'https://monadvision.com/',
    },
  },
})
