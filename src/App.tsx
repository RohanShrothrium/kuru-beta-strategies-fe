import { useState } from 'react'
import { type VaultConfig } from './config/vaults'
import { Header } from './components/Header'
import { VaultList } from './components/VaultList'
import { VaultPage } from './components/VaultPage'

export function App() {
  const [selectedVault, setSelectedVault] = useState<VaultConfig | null>(null)

  return (
    <div className="min-h-screen bg-surface text-white">
      <Header />
      {selectedVault ? (
        <VaultPage vault={selectedVault} onBack={() => setSelectedVault(null)} />
      ) : (
        <VaultList onSelect={setSelectedVault} />
      )}
    </div>
  )
}
