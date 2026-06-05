import { useState } from 'react'
import type { Vaca } from '../types'
import { sendCrc, isMiniappMode } from '../circles'
import { addContribution } from '../store'

interface Props {
  vaca: Vaca
  salaId: string
  walletAddress: string | null
  onBack: () => void
  onUpdated: () => void
}

export function VacaDetail({ vaca, salaId, walletAddress, onBack, onUpdated }: Props) {
  const [amount, setAmount] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const pct = Math.min(100, Math.round((vaca.collectedCrc / vaca.targetCrc) * 100))

  const demoMode = !isMiniappMode()

  const toIsWallet = /^0x[0-9a-fA-F]{40}$/.test(vaca.createdBy)

  async function handleContribute() {
    const crc = parseFloat(amount)
    if (!crc || crc <= 0) return

    setSending(true)
    setError('')
    try {
      if (!demoMode && toIsWallet) {
        if (!walletAddress) { setError('Conectá tu billetera primero'); setSending(false); return }
        await sendCrc(walletAddress!, vaca.createdBy, crc)
      }
      addContribution(salaId, vaca.id, {
        from: walletAddress ?? 'demo',
        amount: crc,
        timestamp: new Date().toISOString(),
      })
      setAmount('')
      onUpdated()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al enviar')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-gray-100">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-900">
          ←
        </button>
        <h2 className="font-semibold text-gray-900 text-lg leading-tight">{vaca.title}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {vaca.description && (
          <p className="text-gray-600 text-sm">{vaca.description}</p>
        )}

        <div className="bg-violet-50 rounded-2xl p-4 space-y-2">
          <div className="flex justify-between text-sm font-medium">
            <span className="text-violet-700">{vaca.collectedCrc} CRC juntados</span>
            <span className="text-gray-500">de {vaca.targetCrc} CRC</span>
          </div>
          <div className="w-full bg-violet-200 rounded-full h-3">
            <div
              className="bg-violet-600 h-3 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-center text-violet-700 font-bold text-lg">{pct}%</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Contribuciones ({vaca.contributions.length})
          </h3>
          {vaca.contributions.length === 0 ? (
            <p className="text-sm text-gray-400">Aún no hay contribuciones. ¡Sé el primero!</p>
          ) : (
            <div className="space-y-2">
              {vaca.contributions.map((c, i) => (
                <div key={i} className="flex justify-between text-sm bg-gray-50 rounded-xl px-3 py-2">
                  <span className="text-gray-500 font-mono text-xs truncate max-w-[180px]">{c.from}</span>
                  <span className="font-semibold text-gray-900">{c.amount} CRC</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-gray-100 space-y-3">
        {!demoMode && !toIsWallet && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2">
            💡 La madrina aún no tiene wallet de Circles. Tu contribución queda registrada, pero sin transacción en la red.
          </p>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            placeholder="Cuántos CRC?"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400"
          />
          <button
            onClick={handleContribute}
            disabled={sending || !amount}
            className="bg-violet-600 text-white px-5 py-3 rounded-xl font-semibold text-sm disabled:opacity-50 hover:bg-violet-700 transition-colors"
          >
            {sending ? '...' : 'Contribuir'}
          </button>
        </div>
      </div>
    </div>
  )
}
