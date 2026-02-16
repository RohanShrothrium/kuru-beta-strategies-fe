/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GRAPHQL_API_URL: string
  readonly VITE_MONAD_RPC_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
