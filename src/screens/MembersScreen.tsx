import { useState, useEffect, useRef } from 'react'
import { getMembers, updateMemberStatus, updateSalaPayoutAddress } from '../db'
import { trustMember, isMiniappMode } from '../circles'
import type { Member, Sala } from '../supabase'
import { WalletCreator } from '../components/WalletCreator'
import { MemberName } from '../components/MemberName'
import { resolveEns, isEns, generateSubname } from '../ens'
import { useTerm, usePrefs } from '../prefs'

interface Props {
  sala: Sala
  buildInviteUrl: () => Promise<string>
  madrinalWallet: string | null
  crcBalance: number | null
  onBack: () => void
  onSalaUpdated: (updated: Sala) => void
}

export function MembersScreen({ sala, buildInviteUrl, madrinalWallet, crcBalance, onBack, onSalaUpdated }: Props) {
  const t = useTerm()
  const { techMode } = usePrefs()
  const [members, setMembers] = useState<Member[]>([])
  const [copied, setCopied] = useState(false)
  const [payoutInput, setPayoutInput] = useState(sala.payout_address ?? '')
  const [payoutSaving, setPayoutSaving] = useState(false)
  const [payoutSaved, setPayoutSaved] = useState(false)
  const [payoutError, setPayoutError] = useState('')
  const [showWalletCreator, setShowWalletCreator] = useState(false)
  const [ensResolving, setEnsResolving] = useState(false)
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null)
  const ensTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function load() {
    setMembers(await getMembers(sala.id))
  }

  useEffect(() => { load() }, [sala.id])

  async function handleApprove(memberId: string) {
    await updateMemberStatus(memberId, 'approved')
    // Circles primitive: madrina trusts the new member's wallet
    if (isMiniappMode() && madrinalWallet) {
      const member = members.find(m => m.id === memberId)
      if (member?.wallet_address) {
        trustMember(madrinalWallet, member.wallet_address).catch(console.error)
      }
    }
    load()
  }

  async function handleReject(memberId: string) {
    await updateMemberStatus(memberId, 'rejected')
    load()
  }

  function isValidAddress(val: string) {
    const v = val.trim()
    return v.startsWith('0x') || v.endsWith('.eth') || v.startsWith('gno:')
  }

  async function handleSavePayout() {
    const val = payoutInput.trim()
    if (!val) return

    // If ENS, must be resolved first
    if (isEns(val)) {
      if (ensResolving) return
      if (!resolvedAddress) {
        setPayoutError('Esperá a que se verifique la dirección o revisá que sea correcta.')
        return
      }
      setPayoutSaving(true)
      setPayoutError('')
      try {
        await updateSalaPayoutAddress(sala.id, resolvedAddress, val)
        onSalaUpdated({ ...sala, payout_address: resolvedAddress, payout_ens: val })
        setPayoutSaved(true)
        setTimeout(() => setPayoutSaved(false), 3000)
      } catch {
        setPayoutError('Error al guardar')
      } finally {
        setPayoutSaving(false)
      }
      return
    }

    if (!isValidAddress(val)) {
      setPayoutError(`Ingresá un nombre de pago (nombre.eth) o la dirección de tu ${t('cuenta digital')}`)
      return
    }
    setPayoutSaving(true)
    setPayoutError('')
    try {
      await updateSalaPayoutAddress(sala.id, val)
      onSalaUpdated({ ...sala, payout_address: val, payout_ens: null })
      setPayoutSaved(true)
      setTimeout(() => setPayoutSaved(false), 3000)
    } catch {
      setPayoutError('Error al guardar')
    } finally {
      setPayoutSaving(false)
    }
  }

  async function copyInvite() {
    const url = await buildInviteUrl()
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const pending = members.filter(m => m.status === 'pending')
  const approved = members.filter(m => m.status === 'approved')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">
      <div className="flex items-center gap-3 p-4 bg-white border-b border-gray-100">
        <button onClick={onBack} className="text-gray-500">←</button>
        <h2 className="font-semibold text-gray-900 flex-1">Miembros · {sala.name}</h2>
        {madrinalWallet && (
          <div className="flex items-center gap-1.5 bg-violet-50 border border-violet-200 rounded-full px-3 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <span className="text-xs font-semibold text-violet-800">
              {crcBalance !== null ? `${Math.floor(crcBalance).toLocaleString('es-AR')} ${techMode ? 'CRC' : 'créd.'}` : '...'}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 p-4 space-y-5 overflow-y-auto">
        {/* Payout address */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-gray-800">💳 Cuenta de cobro</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Cuando una colecta se complete, los fondos se envían acá para hacer la compra.
              Podés usar tu {t('cuenta digital')}, un nombre de pago propio, o la dirección de tu cuenta.
            </p>
          </div>
          {/* Auto-fill with Circles wallet if available */}
          {madrinalWallet && !sala.payout_address && (
            <button
              onClick={() => setPayoutInput(madrinalWallet)}
              className="w-full flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-xl px-3 py-2.5 text-left hover:bg-violet-100 transition-colors"
            >
              <span className="text-lg">🔗</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-violet-800">Usar mi wallet de Circles</p>
                <p className="text-xs font-mono text-violet-600 truncate">{madrinalWallet.slice(0, 10)}…{madrinalWallet.slice(-6)}</p>
              </div>
              <span className="text-xs text-violet-600 font-medium shrink-0">Un click →</span>
            </button>
          )}

          <input
            type="text"
            placeholder="nombre.eth · dirección de cuenta · gno:..."
            value={payoutInput}
            onChange={e => {
              const val = e.target.value
              setPayoutInput(val)
              setPayoutError('')
              setResolvedAddress(null)
              if (ensTimer.current) clearTimeout(ensTimer.current)
              if (isEns(val)) {
                setEnsResolving(true)
                ensTimer.current = setTimeout(async () => {
                  const addr = await resolveEns(val.trim())
                  setEnsResolving(false)
                  if (addr) {
                    setResolvedAddress(addr)
                  } else {
                    setPayoutError('No encontramos esa dirección. Verificá que el nombre sea correcto.')
                  }
                }, 800)
              }
            }}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400 font-mono"
          />
          {ensResolving && (
            <p className="text-xs text-gray-400 flex items-center gap-1">⏳ Verificando dirección...</p>
          )}
          {resolvedAddress && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 space-y-0.5">
              <p className="text-xs text-blue-600 font-medium">✅ Dirección verificada</p>
              <p className="text-xs font-mono text-blue-800 break-all">{resolvedAddress}</p>
            </div>
          )}
          {payoutError && <p className="text-xs text-red-500">{payoutError}</p>}
          {sala.payout_address && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
              <span className="text-green-600 text-xs">✅ Cuenta guardada:</span>
              <span className="text-xs font-mono text-green-800 truncate">{sala.payout_address}</span>
            </div>
          )}
          <button
            onClick={handleSavePayout}
            disabled={payoutSaving || !payoutInput.trim()}
            className="w-full bg-violet-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-violet-700 transition-colors"
          >
            {payoutSaving ? 'Guardando...' : payoutSaved ? '✅ Guardado' : 'Guardar cuenta de cobro'}
          </button>

          {/* Wallet creator */}
          <div className="border-t border-gray-100 pt-3 space-y-2">
            <button
              onClick={() => setShowWalletCreator(v => !v)}
              className="text-xs text-violet-600 font-medium hover:underline w-full text-left"
            >
              {showWalletCreator ? '▲ Ocultar' : `¿No tenés ${t('cuenta digital')}? Creá una gratis →`}
            </button>
            {showWalletCreator && (
              <WalletCreator
                onAddressReady={addr => {
                  setPayoutInput(addr)
                  setShowWalletCreator(false)
                }}
              />
            )}
          </div>
        </div>

        {/* Arcas de la sala — Circles Group vision card */}
        <div className="bg-gradient-to-br from-violet-50 to-amber-50 border border-violet-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏦</span>
              <p className="text-sm font-bold text-gray-800">Arcas de la sala</p>
            </div>
            <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">En desarrollo</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Cada sala tendrá su propia billetera colectiva — separada de la wallet de quien coordina. Los fondos son de todos, y la madrina puede retirarlos cuando se completa una colecta.
          </p>
          <div className="bg-white/70 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-xs shrink-0">✓</span>
              <span>Cualquier miembro puede contribuir, incluso la madrina</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-xs shrink-0">✓</span>
              <span>Los fondos quedan en la sala hasta que se vote retirarlos</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-xs shrink-0">✓</span>
              <span>Historial transparente: quién puso qué, cuándo y para qué</span>
            </div>
          </div>
          <p className="text-xs text-violet-600 font-medium">
            Basado en {techMode ? 'Circles Groups — primitiva nativa del protocolo' : 'grupos de confianza del protocolo Circles'} 🔗
          </p>
        </div>

        {/* ENS subdomain preview */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">🌐 {techMode ? 'ENS de la sala' : 'Dirección web de la sala'}</p>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Próximamente</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl px-3 py-2.5">
            <p className="text-sm font-mono text-gray-500">
              <span className="text-gray-800 font-semibold">
                {generateSubname(sala.name, '')}
              </span>
              .coopera.eth
            </p>
          </div>
          <p className="text-xs text-gray-400">
            Próximamente cada sala de Coopera tendrá su propia dirección web para recibir fondos directamente, sin tener que compartir datos bancarios.
          </p>
        </div>

        {/* Invite link */}
        <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 space-y-2">
          <p className="text-sm font-semibold text-violet-800">Link de invitación</p>
          <p className="text-xs text-gray-400 font-mono">coopera-crc.vercel.app/api/invite?t=•••</p>
          <button
            onClick={copyInvite}
            className="w-full bg-violet-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors"
          >
            {copied ? '✅ Copiado!' : '📋 Copiar link'}
          </button>
        </div>

        {/* Pending approvals */}
        {pending.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Solicitudes pendientes ({pending.length})
            </h3>
            <div className="space-y-2">
              {pending.map(m => (
                <div key={m.id} className="bg-white border border-yellow-200 rounded-xl p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <MemberName member={m} size="sm" />
                    <p className="text-xs text-gray-400 truncate mt-0.5">{m.email}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleApprove(m.id)}
                      className="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-200"
                    >
                      ✓ Aprobar
                    </button>
                    <button
                      onClick={() => handleReject(m.id)}
                      className="bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-200"
                    >
                      ✗
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Approved members */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Miembros aprobados ({approved.length})
          </h3>
          {approved.length === 0 ? (
            <p className="text-sm text-gray-400">Todavía no hay miembros aprobados</p>
          ) : (
            <div className="space-y-2">
              {approved.map(m => (
                <div key={m.id} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-sm shrink-0">
                    {(m.display_name ?? m.email)[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <MemberName member={m} size="sm" />
                    <p className="text-xs text-gray-400 mt-0.5">{m.role === 'madrina' ? '⭐ Madrina' : 'Padre/Madre'}</p>
                  </div>
                  {m.wallet_address && (
                    <span className="ml-auto text-xs text-green-600 shrink-0">✓ {t('cuenta digital')}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
