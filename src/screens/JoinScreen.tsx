import { useState, useEffect } from 'react'
import { requestJoin, getMember } from '../db'
import type { Sala } from '../supabase'
import type { Session } from '../session'

interface Props {
  sala: Sala
  schoolName: string
  isCreator?: boolean
  circlesWallet?: string | null   // injected by Circles Garage
  circlesName?: string | null     // profile name from Circles
  onJoined: (session: Session) => void
  onBack: () => void
}

export function JoinScreen({ sala, schoolName, isCreator = false, circlesWallet, circlesName, onJoined, onBack }: Props) {
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isReturning, setIsReturning] = useState(false)

  // In Circles Garage: wallet + name are already known — skip the form
  const circlesMode = !!circlesWallet
  // Use wallet address as internal email identifier for Circles users
  const circlesEmail = circlesWallet ? `${circlesWallet.toLowerCase()}@circles` : null

  // Auto-join or pre-fill when Circles identity is available
  useEffect(() => {
    if (!circlesMode || !circlesEmail) return
    // Check if already a member
    getMember(sala.id, circlesEmail).then(existing => {
      if (existing?.status === 'approved') {
        setIsReturning(true)
      }
    })
    if (circlesName) setDisplayName(circlesName)
  }, [circlesMode, circlesEmail, circlesName, sala.id])

  async function handleJoinCircles() {
    if (!circlesEmail || !displayName) return
    setLoading(true)
    setError('')
    try {
      const member = await requestJoin(sala.id, circlesEmail, displayName, isCreator)
      if (member.status === 'rejected') {
        setError('Tu solicitud fue rechazada por la madrina de la sala.')
        setLoading(false)
        return
      }
      onJoined({
        email: member.email,
        displayName: member.display_name ?? displayName,
        salaId: sala.id,
        role: member.role,
        status: member.status,
      })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al unirte')
    } finally {
      setLoading(false)
    }
  }

  async function checkEmail(val: string) {
    setEmail(val)
    if (val.includes('@') && val.length > 4) {
      const existing = await getMember(sala.id, val.trim().toLowerCase())
      setIsReturning(!!existing && existing.status === 'approved')
      if (existing?.display_name) setDisplayName(existing.display_name)
    } else {
      setIsReturning(false)
    }
  }

  async function handleJoin() {
    if (!email.trim() || !displayName.trim()) return
    setLoading(true)
    setError('')
    try {
      const member = await requestJoin(sala.id, email.trim().toLowerCase(), displayName.trim(), isCreator)
      if (member.status === 'rejected') {
        setError('Tu solicitud fue rechazada por la madrina de la sala.')
        setLoading(false)
        return
      }
      onJoined({
        email: member.email,
        displayName: member.display_name ?? displayName,
        salaId: sala.id,
        role: member.role,
        status: member.status,
      })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al unirte')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">
      <div className="flex items-center gap-3 p-4 bg-white border-b border-gray-100">
        <button onClick={onBack} className="text-gray-500">←</button>
        <div>
          <p className="font-semibold text-gray-900 text-sm">{sala.name}</p>
          <p className="text-xs text-gray-400">{schoolName}</p>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-5">
        <div className="text-center py-4 space-y-1">
          {isCreator ? (
            <>
              <div className="text-4xl">⭐</div>
              <h2 className="font-bold text-gray-900 text-lg">Creaste la sala</h2>
              <p className="text-sm text-gray-500">Vas a ser la madrina. Confirmá tus datos para entrar.</p>
            </>
          ) : (
            <>
              <div className="text-4xl">👋</div>
              <h2 className="font-bold text-gray-900 text-lg">Pedí acceso a la sala</h2>
              <p className="text-sm text-gray-500">La madrina va a aprobar tu ingreso</p>
            </>
          )}
        </div>

        {/* ── Circles Garage mode: identity already known ── */}
        {circlesMode ? (
          <div className="space-y-4">
            <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-200 flex items-center justify-center text-violet-800 font-bold text-lg">
                  {(displayName || '?')[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{displayName || 'Tu perfil de Circles'}</p>
                  <p className="text-xs text-gray-400 font-mono">{circlesWallet?.slice(0, 6)}…{circlesWallet?.slice(-4)}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Estás entrando con tu cuenta de Circles. Tu nombre e identidad vienen de tu perfil.
              </p>
            </div>

            {/* Allow editing name if needed */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Tu nombre en la sala</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Nombre visible para los demás"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400"
              />
            </div>
          </div>
        ) : (
          /* ── Standard web mode: ask for email + name ── */
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Tu nombre</label>
              <input
                type="text"
                placeholder="Ej: María García"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Tu e-mail</label>
              <input
                type="email"
                placeholder="nombre@email.com"
                value={email}
                onChange={e => checkEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400"
              />
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      <div className="p-4 bg-white border-t border-gray-100">
        <button
          onClick={circlesMode ? handleJoinCircles : handleJoin}
          disabled={loading || !displayName.trim() || (!circlesMode && !email.trim())}
          className="w-full bg-violet-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50 hover:bg-violet-700 transition-colors"
        >
          {loading ? 'Cargando...'
            : isCreator ? 'Entrar como madrina ⭐'
            : isReturning ? 'Volver a entrar →'
            : circlesMode ? `Entrar con Circles →`
            : 'Pedir acceso'}
        </button>
      </div>
    </div>
  )
}
