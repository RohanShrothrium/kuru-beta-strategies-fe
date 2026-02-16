import { Routes, Route, useNavigate, useParams } from 'react-router-dom'
import { VAULTS } from './config/vaults'
import { Header } from './components/Header'
import { VaultList } from './components/VaultList'
import { VaultPage } from './components/VaultPage'

export function App() {
  return (
    <div className="min-h-screen bg-surface text-white">
      <Header />
      <Routes>
        <Route path="/" element={<VaultListPage />} />
        <Route path="/vault/:vaultId" element={<VaultDetailPage />} />
      </Routes>
    </div>
  )
}

function VaultListPage() {
  const navigate = useNavigate()

  return (
    <VaultList
      onSelect={(vault) => navigate(`/vault/${vault.id}`)}
    />
  )
}

function VaultDetailPage() {
  const { vaultId } = useParams<{ vaultId: string }>()
  const navigate = useNavigate()

  const vault = VAULTS.find((v) => v.id === vaultId)

  if (!vault) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-white">Vault not found</h1>
          <button
            onClick={() => navigate('/')}
            className="mt-4 text-accent hover:underline"
          >
            ← Back to vaults
          </button>
        </div>
      </div>
    )
  }

  return <VaultPage vault={vault} onBack={() => navigate('/')} />
}
