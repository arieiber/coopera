import { useState, useEffect } from 'react'
import { requestJoin, getMember, getMembers, getMadrinaWallet } from '../db'
import { trustMember, isMiniappMode } from '../circles'
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
  const [childName, setChildName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isReturning, setIsReturning] = useState(false)
  const [salaHasMadrina, setSalaHasMadrina] = useState<boolean | null>(null) // null = loading
  const [wantsMadrina, setWantsMadrina] = useState(false)
  // After joining: offer to create trust toward the madrina
  const [trustOffer, setTrustOffer] = useState<{ madrinaWallet: string; madrinaName: string; pendingSession: Session } | null>(null)

  // In Circles Garage: wallet + name are already known — skip the form
  const circlesMode = !!circlesWallet
  // Use wallet address as internal email identifier for Circles users
  const circlesEmail = circlesWallet ? `${circlesWallet.toLowerCase()}@circles` : null

  // Check if sala already has a madrina
  useEffect(() => {
    getMembers(sala.id).then(members => {
      const hasMadrina = members.some(m => m.role === 'madrina' && m.status === 'approved')
      setSalaHasMadrina(hasMadrina)
    })
  }, [sala.id])

  // Auto-join or pre-fill when Circles identity is available
  useEffect(() => {
    if (!circlesMode || !circlesEmail) return
    getMember(sala.id, circlesEmail).then(existing => {
      if (existing?.status === 'approved') setIsReturning(true)
      // Pre-fill name: saved DB name > Circles profile name
      const savedName = existing?.display_name
      if (savedName) setDisplayName(savedName)
      else if (circlesName) setDisplayName(circlesName)
      if (existing?.child_name) setChildName(existing.child_name)
    })
  }, [circlesMode, circlesEmail, circlesName, sala.id])

  const effectivelyMadrina = isCreator || wantsMadrina

  async function afterJoin(member: Awaited<ReturnType<typeof requestJoin>>, nameUsed: string) {
    const sess: Session = {
      email: member.email,
      displayName: member.display_name ?? nameUsed,
      salaId: sala.id,
      role: member.role,
      status: member.status as 'pending' | 'approved',
    }
    // If joining as a regular member with Circles wallet, offer trust toward madrina
    if (isMiniappMode() && circlesWallet && member.role !== 'madrina') {
      const madrinaWallet = await getMadrinaWallet(sala.id)
      if (madrinaWallet && madrinaWallet.toLowerCase() !== circlesWallet.toLowerCase()) {
        // Find madrina name for the UI
        const allMembers = await getMembers(sala.id)
        const madrina = allMembers.find(m => m.role === 'madrina')
        setTrustOffer({ madrinaWallet, madrinaName: madrina?.display_name ?? 'la madrina', pendingSession: sess })
        return
      }
    }
    onJoined(sess)
  }

  async function handleJoinCircles() {
    if (!circlesEmail || !displayName) return
    setLoading(true)
    setError('')
    try {
      const member = await requestJoin(sala.id, circlesEmail, displayName, effectivelyMadrina, childName.trim() || undefined)
      if (member.status === 'rejected') {
        setError('Tu solicitud fue rechazada por la madrina de la sala.')
        setLoading(false)
        return
      }
      await afterJoin(member, displayName)
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
      const member = await requestJoin(sala.id, email.trim().toLowerCase(), displayName.trim(), effectivelyMadrina, childName.trim() || undefined)
      if (member.status === 'rejected') {
        setError('Tu solicitud fue rechazada por la madrina de la sala.')
        setLoading(false)
        return
      }
      await afterJoin(member, displayName)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al unirte')
    } finally {
      setLoading(false)
    }
  }

  // Offer madrina role when sala has no madrina and user is not the creator
  const showMadrinaOffer = !isCreator && salaHasMadrina === false

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
          ) : wantsMadrina ? (
            <>
              <div className="text-4xl">⭐</div>
              <h2 className="font-bold text-gray-900 text-lg">Vas a ser la madrina</h2>
              <p className="text-sm text-gray-500">Entrás directamente como responsable de la sala.</p>
            </>
          ) : (
            <>
              <div className="text-4xl">👋</div>
              <h2 className="font-bold text-gray-900 text-lg">Pedí acceso a la sala</h2>
              <p className="text-sm text-gray-500">La madrina va a aprobar tu ingreso</p>
            </>
          )}
        </div>

        {/* ── Madrina offer — only when sala has no madrina yet ── */}
        {showMadrinaOffer && (
          <div className={`rounded-2xl border-2 p-4 cursor-pointer transition-colors ${
            wantsMadrina
              ? 'border-yellow-400 bg-yellow-50'
              : 'border-gray-200 bg-white hover:border-yellow-300'
          }`}
            onClick={() => setWantsMadrina(v => !v)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⭐</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">¿Querés ser la madrina?</p>
                  <p className="text-xs text-gray-500">Esta sala no tiene responsable aún. Podés tomar ese rol.</p>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                wantsMadrina ? 'border-yellow-500 bg-yellow-400' : 'border-gray-300'
              }`}>
                {wantsMadrina && <span className="text-white text-xs font-bold">✓</span>}
              </div>
            </div>
            {wantsMadrina && (
              <p className="text-xs text-yellow-700 mt-2 pt-2 border-t border-yellow-200">
                Como madrina vas a poder aprobar miembros, crear colectas y configurar la cuenta de cobro.
              </p>
            )}
          </div>
        )}

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
              <label className="text-sm font-medium text-gray-700 block mb-1">Tu nombre</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Ej: María"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Mamá / Papá de… <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                value={childName}
                onChange={e => setChildName(e.target.value)}
                placeholder="Ej: Sofía"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400"
              />
              {childName && (
                <p className="text-xs text-gray-400 mt-1 ml-1">
                  Vas a aparecer como <span className="text-gray-600 font-medium">{displayName || 'vos'}</span>
                  <span className="text-gray-400"> · de {childName}</span>
                </p>
              )}
            </div>
          </div>
        ) : (
          /* ── Standard web mode: ask for email + name ── */
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Tu nombre</label>
              <input
                type="text"
                placeholder="Ej: María"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Mamá / Papá de… <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                placeholder="Ej: Sofía"
                value={childName}
                onChange={e => setChildName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400"
              />
              {childName && (
                <p className="text-xs text-gray-400 mt-1 ml-1">
                  Vas a aparecer como <span className="text-gray-600 font-medium">{displayName || 'vos'}</span>
                  <span className="text-gray-400"> · de {childName}</span>
                </p>
              )}
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
            : isCreator || wantsMadrina ? 'Entrar como madrina ⭐'
            : isReturning ? 'Volver a entrar →'
            : circlesMode ? 'Entrar con Circles →'
            : 'Pedir acceso'}
        </button>
      </div>

      {/* Trust offer modal — shown after joining when madrina has a wallet */}
      {trustOffer && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🤝</span>
              <div>
                <p className="font-semibold text-gray-900">Conectar con la sala</p>
                <p className="text-sm text-gray-500 mt-1">
                  Para poder enviar créditos a <span className="font-medium text-gray-700">{trustOffer.madrinaName}</span>, tu cuenta de Circles necesita conectarse con la de ella.
                </p>
              </div>
            </div>
            <div className="bg-violet-50 border border-violet-200 rounded-xl px-3 py-2.5 text-xs text-violet-800">
              Tu billetera va a pedir confirmación. <strong>No mueve fondos</strong> — es solo una conexión que permite futuros envíos.
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setTrustOffer(null); onJoined(trustOffer.pendingSession) }}
                className="flex-1 border border-gray-200 text-gray-500 py-2.5 rounded-xl text-sm"
              >
                Ahora no
              </button>
              <button
                onClick={async () => {
                  if (circlesWallet) {
                    await trustMember(circlesWallet, trustOffer.madrinaWallet).catch(console.error)
                  }
                  setTrustOffer(null)
                  onJoined(trustOffer.pendingSession)
                }}
                className="flex-1 bg-violet-600 text-white py-2.5 rounded-xl text-sm font-semibold"
              >
                Conectar →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
