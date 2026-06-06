import { useState } from 'react'
import { recoverMessageAddress } from 'viem'

// Only this address can access the admin panel — eiberman.eth
const ADMIN_ADDRESS = '0x5996198CE4ad17D3CF0510E32dA2C92a9CC48241'

const MESSAGE = `Coopera Admin Access\nI authorize admin access to Coopera.\n\nThis signature does not move any funds.`

interface Props {
  onVerified: () => void
}

export function AdminLogin({ onVerified }: Props) {
  const [status, setStatus] = useState<'idle' | 'signing' | 'error'>('idle')
  const [error, setError] = useState('')

  async function handleSign() {
    setStatus('signing')
    setError('')
    try {
      const ethereum = (window as any).ethereum
      if (!ethereum) {
        // Try Circles Playground injected wallet
        setError('No wallet detected. Open this page from Circles Playground with your eiberman.eth wallet connected.')
        setStatus('error')
        return
      }

      const accounts: string[] = await ethereum.request({ method: 'eth_requestAccounts' })
      const account = accounts[0]
      if (!account) throw new Error('No account available')

      const signature = await ethereum.request({
        method: 'personal_sign',
        params: [MESSAGE, account],
      })

      const recovered = await recoverMessageAddress({ message: MESSAGE, signature })

      if (recovered.toLowerCase() !== ADMIN_ADDRESS.toLowerCase()) {
        setError(`Firma válida pero esta wallet (${recovered.slice(0, 8)}…) no tiene acceso admin. Solo eiberman.eth puede entrar.`)
        setStatus('error')
        return
      }

      onVerified()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al firmar'
      setError(msg.includes('rejected') ? 'Firma cancelada.' : msg)
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="text-4xl">🔑</div>
          <h1 className="text-xl font-bold text-gray-100">Coopera Admin</h1>
          <p className="text-sm text-gray-500">
            Acceso restringido. Firmá con tu wallet para verificar tu identidad.
          </p>
        </div>

        {/* Info card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-violet-900 flex items-center justify-center text-sm">🦊</div>
            <div>
              <p className="text-xs font-semibold text-gray-300">Wallet autorizada</p>
              <p className="text-xs font-mono text-violet-400">eiberman.eth</p>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-3">
            <p className="text-xs text-gray-600">Mensaje a firmar:</p>
            <pre className="text-xs text-gray-400 mt-1 whitespace-pre-wrap font-mono bg-gray-800 rounded-lg p-2">
              {MESSAGE}
            </pre>
          </div>
          <p className="text-xs text-green-600">✓ Esta firma no mueve créditos ni aprueba transacciones.</p>
        </div>

        {error && (
          <div className="bg-red-950 border border-red-800 rounded-xl px-4 py-3">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        <button
          onClick={handleSign}
          disabled={status === 'signing'}
          className="w-full bg-violet-600 text-white py-3.5 rounded-xl font-semibold text-sm disabled:opacity-50 hover:bg-violet-700 transition-colors"
        >
          {status === 'signing' ? 'Esperando firma…' : 'Firmar con wallet →'}
        </button>

        <p className="text-center text-xs text-gray-700">
          El acceso se mantiene solo durante esta sesión del browser.
        </p>
      </div>
    </div>
  )
}
