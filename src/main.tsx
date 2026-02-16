import '@rainbow-me/rainbowkit/styles.css'
import './index.css'

import React from 'react'
import ReactDOM from 'react-dom/client'
import { getDefaultConfig, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

import { monad } from './config/chains'
import { App } from './App'

const wagmiConfig = getDefaultConfig({
  appName: 'Kuru Strategies',
  projectId: import.meta.env.VITE_WC_PROJECT_ID ?? 'dev',
  chains: [monad],
  ssr: false,
})

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#6ee7b7',
            accentColorForeground: '#0e0f14',
            borderRadius: 'medium',
            fontStack: 'system',
          })}
        >
          <App />
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#13141c',
                color: '#fff',
                border: '1px solid #252637',
                fontSize: 13,
              },
            }}
          />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
)
