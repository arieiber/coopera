import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useEffect } from 'react'

interface Props {
  onAddressReady: (address: string) => void
}

export function WalletCreator({ onAddressReady }: Props) {
  const { ready, authenticated, login, logout } = usePrivy()
  const { wallets } = useWallets()

  // When wallets are available after login, auto-fill the address
  useEffect(() => {
    if (!authenticated) return
    const embedded = wallets.find(w => w.walletClientType === 'privy')
    if (embedded?.address) {
      onAddressReady(embedded.address)
    }
  }, [wallets, authenticated])

  if (!ready) return (
    <div className="text-xs text-gray-400 text-center py-2">Cargando...</div>
  )

  if (authenticated) {
    const embedded = wallets.find(w => w.walletClientType === 'privy')
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-green-700 font-medium">✅ Cuenta digital creada</p>
          <button onClick={logout} className="text-xs text-gray-400 hover:text-gray-600">Salir</button>
        </div>
        {embedded && (
          <p className="text-xs text-green-700">Tu cuenta digital está lista para recibir fondos.</p>
        )}
        {embedded && (
          <button
            onClick={() => onAddressReady(embedded.address)}
            className="w-full bg-green-600 text-white py-2 rounded-xl text-xs font-semibold hover:bg-green-700 transition-colors"
          >
            Usar esta dirección como cuenta de cobro
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">
        Creá una cuenta digital gratuita con tu Google o email — sin instalar nada, en segundos.
      </p>
      <button
        onClick={login}
        className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-200 text-gray-700 py-3 rounded-xl text-sm font-semibold hover:border-violet-400 hover:bg-violet-50 transition-colors"
      >
        <span>🔑</span> Crear cuenta digital gratis
      </button>
    </div>
  )
}
