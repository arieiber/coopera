import { useState, useEffect } from 'react'
import { getVacas, createVaca as dbCreateVaca, getContributions, addContribution as dbAddContribution, updateVacaStatus, deleteVaca as dbDeleteVaca, getMembers } from '../db'
import type { Sala, Vaca, Contribution, OverflowPolicy } from '../supabase'
import type { Session } from '../session'
import { sendCrc, isMiniappMode } from '../circles'
import { track } from '../analytics'
import { useTerm, usePrefs } from '../prefs'

interface Props {
  sala: Sala
  schoolName: string
  session: Session
  crcBalance: number | null
  wallet: string | null
  onOpenMembers: () => void
  onOpenSettings: () => void
  onChangeSala: () => void
}

type View = 'list' | 'vaca-detail' | 'new-vaca'

const OVERFLOW_OPTIONS: { value: OverflowPolicy; label: string; desc: string }[] = [
  { value: 'cap', label: 'Cerrar al llegar a la meta', desc: 'No se aceptan más aportes una vez que se alcanza el objetivo' },
  { value: 'refund', label: 'Devolver lo que sobre', desc: 'Al cerrar, se devuelve proporcionalmente lo que sobró a cada familia' },
  { value: 'rollover', label: 'Guardar para la próxima colecta', desc: 'Lo que sobre queda guardado para usarlo en la siguiente colecta' },
]

export function SalaScreen({ sala, schoolName, session, crcBalance, wallet, onOpenMembers, onOpenSettings, onChangeSala }: Props) {
  const t = useTerm()
  const { techMode } = usePrefs()
  const [vacas, setVacas] = useState<Vaca[]>([])
  const [activeVaca, setActiveVaca] = useState<Vaca | null>(null)
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [view, setView] = useState<View>('list')
  const [loading, setLoading] = useState(true)
  const [memberCount, setMemberCount] = useState(0)
  const [inviteCopied, setInviteCopied] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)

  // New vaca form
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [target, setTarget] = useState('')
  const [deadline, setDeadline] = useState('')
  const [overflowPolicy, setOverflowPolicy] = useState<OverflowPolicy>('cap')

  // Contribute
  const [amount, setAmount] = useState('')
  const [sending, setSending] = useState(false)
  const [justSent, setJustSent] = useState(false)
  const [error, setError] = useState('')

  // Vaca close confirm
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [deletingVacaId, setDeletingVacaId] = useState<string | null>(null)

  const demoMode = !isMiniappMode()
  const isMadrina = session.role === 'madrina'
  const inviteUrl = `${window.location.origin}/api/invite?token=${sala.invite_token}&sala=${encodeURIComponent(sala.name)}&school=${encodeURIComponent(schoolName)}`

  async function loadVacas() {
    setLoading(true)
    setVacas(await getVacas(sala.id))
    setLoading(false)
  }

  async function loadMemberCount() {
    const members = await getMembers(sala.id)
    setMemberCount(members.filter(m => m.status === 'approved').length)
  }

  async function openVaca(vaca: Vaca) {
    setActiveVaca(vaca)
    setContributions(await getContributions(vaca.id))
    setView('vaca-detail')
  }

  useEffect(() => {
    loadVacas()
    loadMemberCount()
  }, [sala.id])

  // Per-family calculation — always dynamic based on current approved member count
  const perFamily = target && memberCount > 0
    ? Math.ceil(parseFloat(target) / memberCount)
    : null

  function perFamilyForVaca(vaca: Vaca) {
    return memberCount > 0 ? Math.ceil(vaca.target_crc / memberCount) : null
  }

  async function handleCreateVaca() {
    if (!title.trim() || !target || !deadline) return
    await dbCreateVaca(
      sala.id, title.trim(), description.trim(),
      parseFloat(target), deadline, session.email,
      overflowPolicy,
      perFamily ?? undefined,
    )
    setTitle(''); setDescription(''); setTarget(''); setDeadline('')
    setOverflowPolicy('cap')
    await loadVacas()
    setView('list')
  }

  async function handleContribute() {
    if (!activeVaca || !amount) return
    const crc = parseFloat(amount)
    // In Circles Garage: check real balance before attempting tx
    if (!demoMode && crcBalance !== null && crc > crcBalance) {
      setError(`No tenés suficientes ${t('créditos')}. Tu saldo es ${Math.floor(crcBalance)}.`)
      return
    }
    setSending(true); setError('')
    try {
      const sink = sala.payout_address
      const sinkIsWallet = sink && /^0x[0-9a-fA-F]{40}$/.test(sink)
      if (!demoMode && wallet && sinkIsWallet) await sendCrc(wallet, sink, crc)
      track('vaca_contributed', { sala_id: sala.id, amount: crc })
      const actual = await dbAddContribution(activeVaca.id, session.email, session.displayName, crc, undefined, demoMode)
      setAmount('')
      setJustSent(true)
      setTimeout(() => setJustSent(false), 2000)
      // Refresh
      const updated = await getVacas(sala.id)
      setVacas(updated)
      const fresh = updated.find(v => v.id === activeVaca.id)
      if (fresh) setActiveVaca(fresh)
      setContributions(await getContributions(activeVaca.id))
      if (actual < crc) {
        setError(`Solo se aceptaron ${actual} ${t('créditos')} para completar la meta exacta.`)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al contribuir')
    } finally {
      setSending(false)
    }
  }

  async function handleDeleteVaca(vacaId: string) {
    await dbDeleteVaca(vacaId)
    setDeletingVacaId(null)
    await loadVacas()
  }

  async function handleCloseVaca(vaca: Vaca) {
    await updateVacaStatus(vaca.id, 'closed')
    const updated = await getVacas(sala.id)
    setVacas(updated)
    const fresh = updated.find(v => v.id === vaca.id)
    if (fresh) setActiveVaca(fresh)
    setShowCloseConfirm(false)
  }

  // ── New Vaca form ─────────────────────────────────────────────────────────
  if (view === 'new-vaca') return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">
      <div className="flex items-center gap-3 p-4 bg-white border-b border-gray-100">
        <button onClick={() => setView('list')} className="text-gray-500">←</button>
        <h2 className="font-semibold text-gray-900">Nueva vaca 🐄</h2>
      </div>
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">¿Para qué es?</label>
          <input type="text" placeholder="Ej: Pañales para la semana" value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Detalle (opcional)</label>
          <textarea placeholder="Ej: Talle M, marca Huggies" value={description}
            onChange={e => setDescription(e.target.value)} rows={2}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400 resize-none" />
        </div>

        {/* Target + per family calc */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">¿Cuánto necesitamos juntar?</label>
          <input type="number" min="1" placeholder="Ej: 200" value={target}
            onChange={e => setTarget(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400" />
          {perFamily && (
            <div className="mt-2 bg-violet-50 border border-violet-200 rounded-xl px-4 py-2 flex items-center justify-between">
              <span className="text-sm text-violet-700">Por familia ({memberCount} familias)</span>
              <span className="font-bold text-violet-800">{perFamily} {t('créditos')}</span>
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Fecha límite</label>
          <input type="date" min={new Date().toISOString().split('T')[0]} value={deadline}
            onChange={e => setDeadline(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400" />
        </div>

        {/* Overflow policy */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">¿Qué hacemos si se juntan más {t('créditos')} de los necesarios?</label>
          <div className="space-y-2">
            {OVERFLOW_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setOverflowPolicy(opt.value)}
                className={`w-full text-left border-2 rounded-xl px-4 py-3 transition-colors ${
                  overflowPolicy === opt.value
                    ? 'border-violet-400 bg-violet-50'
                    : 'border-gray-200 bg-white'
                }`}>
                <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="p-4 bg-white border-t border-gray-100 space-y-2">
        {!sala.payout_address && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-700 font-medium">
            ⚠️ Necesitás configurar una cuenta de cobro antes de publicar una vaca. Los papás necesitan saber adónde van sus créditos.
            <button onClick={() => { setView('list'); onOpenMembers() }}
              className="block mt-1 text-amber-800 underline font-semibold">
              Configurar cuenta →
            </button>
          </div>
        )}
        <button onClick={handleCreateVaca} disabled={!title.trim() || !target || !deadline || !sala.payout_address}
          className="w-full bg-violet-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50 hover:bg-violet-700 transition-colors">
          Crear vaca 🐄
        </button>
      </div>
    </div>
  )

  // ── Vaca detail ───────────────────────────────────────────────────────────
  if (view === 'vaca-detail' && activeVaca) {
    const pct = Math.min(100, Math.round((activeVaca.collected_crc / activeVaca.target_crc) * 100))
    const reachedGoal = activeVaca.collected_crc >= activeVaca.target_crc
    const isComplete = activeVaca.status === 'completed' || (activeVaca.status !== 'closed' && reachedGoal)
    const isClosed = activeVaca.status === 'closed'
    const isActive = !isComplete && !isClosed
    const overOption = OVERFLOW_OPTIONS.find(o => o.value === activeVaca.overflow_policy)

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">
        <div className="flex items-center gap-3 p-4 bg-white border-b border-gray-100">
          <button onClick={() => { setView('list'); setShowCloseConfirm(false) }} className="text-gray-500">←</button>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-gray-900 text-base leading-tight truncate">{activeVaca.title}</h2>
            <p className="text-xs text-gray-400">
              {isComplete ? '✅ Completada' : isClosed ? '🔒 Cerrada' : `📅 Vence ${activeVaca.deadline}`}
            </p>
          </div>
        </div>

        <div className="flex-1 p-4 space-y-5 overflow-y-auto">
          {activeVaca.description && <p className="text-gray-600 text-sm">{activeVaca.description}</p>}

          {/* Progress */}
          <div className={`rounded-2xl p-4 space-y-2 ${isComplete ? 'bg-green-50' : 'bg-violet-50'}`}>
            <div className="flex justify-between text-sm font-medium">
              <span className={isComplete ? 'text-green-700' : 'text-violet-700'}>
                {activeVaca.collected_crc} {t('créditos')} juntados
              </span>
              <span className="text-gray-500">meta: {activeVaca.target_crc}</span>
            </div>
            <div className={`w-full rounded-full h-3 ${isComplete ? 'bg-green-200' : 'bg-violet-200'}`}>
              <div
                className={`h-3 rounded-full transition-all duration-500 ${isComplete ? 'bg-green-500' : 'bg-violet-600'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className={`text-center font-bold text-lg ${isComplete ? 'text-green-700' : 'text-violet-700'}`}>
              {isComplete ? '🎉 ¡Meta alcanzada!' : `${pct}%`}
            </p>
            {isActive && perFamilyForVaca(activeVaca) && (
              <p className="text-center text-xs text-gray-500">
                Cuota sugerida por familia: <strong>{perFamilyForVaca(activeVaca)} {t('créditos')}</strong>
              </p>
            )}
            {overOption && (
              <p className="text-center text-xs text-gray-400">
                Si se supera la meta: {overOption.label.toLowerCase()}
              </p>
            )}
          </div>

          {/* Completed — madrina action + offramp */}
          {isComplete && (
            <div className="space-y-3">
              {/* Explicit complete button if not yet formally marked */}
              {isMadrina && activeVaca.status !== 'completed' && (
                <button
                  onClick={async () => {
                    await updateVacaStatus(activeVaca.id, 'completed')
                    const updated = await getVacas(sala.id)
                    setVacas(updated)
                    const fresh = updated.find(v => v.id === activeVaca.id)
                    if (fresh) setActiveVaca(fresh)
                  }}
                  className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors"
                >
                  ✅ Marcar como completada y cobrar
                </button>
              )}

              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-3">
                <h3 className="font-semibold text-green-800 text-sm">💸 ¿Cómo usar los fondos?</h3>
                <p className="text-xs text-green-700">
                  Los {t('créditos')} juntados se pueden convertir y enviar a la cuenta bancaria de la madrina para hacer la compra.
                </p>

                {sala.payout_address ? (
                  <div className="bg-white border border-green-200 rounded-xl px-3 py-2.5 space-y-1">
                    <p className="text-xs text-gray-500">Destino configurado:</p>
                    {sala.payout_ens && (
                      <p className="text-sm font-semibold text-gray-800">{sala.payout_ens}</p>
                    )}
                    <p className="text-xs font-mono text-gray-500 break-all">{sala.payout_address}</p>
                  </div>
                ) : isMadrina ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 space-y-3">
                    <p className="text-xs text-yellow-800 font-medium">⚠️ Todavía no configuraste una cuenta de cobro.</p>

                    <button
                      onClick={() => { setView('list'); onOpenMembers() }}
                      className="w-full bg-yellow-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-yellow-600 transition-colors"
                    >
                      Configurar cuenta de cobro →
                    </button>

                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2.5">
                    <p className="text-xs text-yellow-700">⚠️ La madrina aún no configuró una cuenta de cobro.</p>
                  </div>
                )}

                <button disabled
                  className="w-full border-2 border-dashed border-green-300 text-green-600 py-2.5 rounded-xl text-sm font-medium opacity-70 cursor-not-allowed">
                  🔜 Enviar fondos a cuenta bancaria — próximamente
                </button>
                <p className="text-xs text-gray-400 text-center">
                  Estamos trabajando en la integración para transferir a cuenta bancaria
                </p>
              </div>
            </div>
          )}

          {/* Close vaca (madrina, active only) */}
          {isMadrina && isActive && (
            <div>
              {!showCloseConfirm ? (
                <button onClick={() => setShowCloseConfirm(true)}
                  className="w-full border border-red-200 text-red-500 py-2.5 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors">
                  Cerrar vaca sin llegar a la meta
                </button>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-red-700">¿Cerrar la vaca?</p>
                  <p className="text-xs text-red-600">
                    {activeVaca.overflow_policy === 'refund'
                      ? `Los ${t('créditos')} aportados serán devueltos a cada familia proporcionalmente.`
                      : `Los ${t('créditos')} parciales quedarán guardados para la próxima colecta.`}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setShowCloseConfirm(false)}
                      className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-xl text-sm">
                      Cancelar
                    </button>
                    <button onClick={() => handleCloseVaca(activeVaca)}
                      className="flex-1 bg-red-500 text-white py-2 rounded-xl text-sm font-semibold">
                      Sí, cerrar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Contributions list */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Contribuciones ({contributions.length})
            </h3>
            {contributions.length === 0
              ? <p className="text-sm text-gray-400">¡Sé el primero en contribuir!</p>
              : <div className="space-y-2">
                {contributions.map(c => (
                  <div key={c.id} className="flex justify-between items-center text-sm bg-white border border-gray-100 rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-xs shrink-0">
                        {(c.display_name ?? c.member_email)[0].toUpperCase()}
                      </div>
                      <div>
                        <span className="text-gray-700">{c.display_name ?? c.member_email}</span>
                        {c.is_demo && <span className="ml-1.5 text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">demo</span>}
                      </div>
                    </div>
                    <span className="font-semibold text-gray-900">{c.amount_crc} {t('créditos')}</span>
                  </div>
                ))}
              </div>
            }
          </div>
        </div>

        {/* Contribute input */}
        {isActive && (
          <div className="p-4 bg-white border-t border-gray-100 space-y-2">
            {!demoMode && !sala.payout_address && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2.5 text-xs text-yellow-800">
                ⚠️ La madrina todavía no configuró dónde recibir los fondos. Tus créditos quedarán registrados pero no se enviarán hasta que lo haga.
              </div>
            )}
            {error && <p className="text-sm text-orange-500">{error}</p>}
            {perFamilyForVaca(activeVaca) && (
              <button
                onClick={() => setAmount(String(perFamilyForVaca(activeVaca)))}
                className="w-full border border-violet-200 bg-violet-50 text-violet-700 py-2 rounded-xl text-sm font-medium hover:bg-violet-100 transition-colors"
              >
                Poner cuota sugerida: {perFamilyForVaca(activeVaca)} {t('créditos')}
              </button>
            )}
            <div className="flex gap-2">
              <input type="number" min="1"
                placeholder={`¿Cuántos ${t('créditos')}?`}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400" />
              <button onClick={handleContribute} disabled={sending || !amount}
                className={`px-5 py-3 rounded-xl font-semibold text-sm disabled:opacity-50 transition-all ${
                  justSent
                    ? 'bg-green-500 text-white scale-95'
                    : 'bg-violet-600 text-white hover:bg-violet-700'
                }`}>
                {sending ? '⏳' : justSent ? '💸' : 'Contribuir'}
              </button>
            </div>
          </div>
        )}

        {(isClosed || isComplete) && (
          <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-400">
              {isClosed ? '🔒 Esta vaca está cerrada' : '✅ Esta vaca está completada'}
            </p>
          </div>
        )}
      </div>
    )
  }

  // ── Vaca list ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Coopera" className="w-7 h-7 rounded-full" />
              <h1 className="text-base font-bold text-gray-900">{sala.name}</h1>
            </div>
            <p className="text-xs text-gray-400">{schoolName}</p>
          </div>
          <div className="flex items-center gap-2">
            {isMadrina && (
              <button onClick={onOpenMembers}
                className="text-xs bg-violet-100 text-violet-700 px-3 py-1.5 rounded-full font-medium">
                👥 Miembros
              </button>
            )}
            <button onClick={onChangeSala}
              className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
              title="Cambiar sala">
              🏫 Cambiar sala
            </button>
            <button onClick={onOpenSettings} className="text-lg text-gray-400 hover:text-gray-600 px-1" title="Configuración">⚙️</button>
          </div>
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-gray-500">
            {isMadrina ? '⭐ Madrina' : `👤 ${session.displayName}`}
          </p>
          {wallet && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              {crcBalance !== null ? (
                <span className="text-xs font-semibold text-gray-700">
                  {Math.floor(crcBalance).toLocaleString('es-AR')}{' '}
                  <span className="font-normal text-gray-400">{techMode ? 'CRC' : 'créd.'}</span>
                </span>
              ) : (
                <span className="text-xs text-gray-400">cargando...</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Demo mode banner — shown when outside Circles Playground */}
      {demoMode && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-start gap-2">
          <span className="text-lg leading-none mt-0.5">🔬</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-800">Modo demostración</p>
            <p className="text-xs text-amber-700 leading-snug">
              Las contribuciones son de prueba — no son transacciones reales.
              Para contribuir de verdad, abrí la app desde{' '}
              <a href="https://circles.gnosis.io/playground" target="_blank" rel="noreferrer"
                className="underline font-medium">Circles Playground</a>.
            </p>
          </div>
        </div>
      )}

      {/* Madrina sin cuenta de cobro — vacas visibles pero contribución bloqueada */}
      {!sala.payout_address && !isMadrina && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2.5 flex items-center gap-2">
          <span>⚠️</span>
          <p className="text-xs text-yellow-800">
            La madrina aún no configuró una cuenta de cobro. Las contribuciones quedan registradas pero no se envían hasta que lo haga.
          </p>
        </div>
      )}
      {!sala.payout_address && isMadrina && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2.5 flex items-center justify-between gap-2">
          <p className="text-xs text-yellow-800 font-medium">⚠️ Configurá una cuenta de cobro para que las vacas sean efectivas.</p>
          <button onClick={onOpenMembers} className="text-xs font-semibold text-yellow-900 underline shrink-0">Configurar →</button>
        </div>
      )}

      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-gray-400 text-sm">Cargando...</p>
          </div>
        ) : vacas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center space-y-3">
            <div className="text-4xl">🐄</div>
            <p className="text-sm text-gray-500">No hay vacas activas</p>
            {isMadrina && (
              <button onClick={() => setView('new-vaca')} className="text-sm text-violet-600 font-medium">
                Crear la primera vaca →
              </button>
            )}
          </div>
        ) : (
          vacas.map(vaca => {
            const pct = Math.min(100, Math.round((vaca.collected_crc / vaca.target_crc) * 100))
            const daysLeft = Math.ceil((new Date(vaca.deadline).getTime() - Date.now()) / 86400000)
            const reachedGoal = vaca.collected_crc >= vaca.target_crc
            const isComplete = vaca.status === 'completed' || (vaca.status !== 'closed' && reachedGoal)
            const isClosed = vaca.status === 'closed'
            return (
              <div key={vaca.id} className="relative">
              {isMadrina && deletingVacaId === vaca.id && (
                <div className="absolute inset-0 z-10 bg-red-50 border-2 border-red-300 rounded-2xl flex flex-col items-center justify-center gap-3 p-4">
                  <p className="text-sm font-semibold text-red-700">¿Eliminar esta vaca?</p>
                  <p className="text-xs text-red-500 text-center">Esta acción no se puede deshacer.</p>
                  <div className="flex gap-2 w-full">
                    <button onClick={() => setDeletingVacaId(null)}
                      className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-xl text-sm">
                      Cancelar
                    </button>
                    <button onClick={() => handleDeleteVaca(vaca.id)}
                      className="flex-1 bg-red-500 text-white py-2 rounded-xl text-sm font-semibold">
                      Sí, eliminar
                    </button>
                  </div>
                </div>
              )}
              <button onClick={() => openVaca(vaca)}
                className={`w-full text-left rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow border ${
                  isComplete ? 'bg-green-50 border-green-200' : isClosed ? 'bg-gray-50 border-gray-200 opacity-70' : 'bg-white border-gray-200'
                }`}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-gray-900 text-base leading-tight flex-1">{vaca.title}</h3>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isComplete ? (
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-700">✅ Completa</span>
                    ) : isClosed ? (
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-gray-100 text-gray-500">🔒 Cerrada</span>
                    ) : (
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${daysLeft <= 2 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {daysLeft > 0 ? `${daysLeft}d` : 'Vencida'}
                      </span>
                    )}
                    {isMadrina && vaca.collected_crc === 0 && (
                      <button
                        onClick={e => { e.stopPropagation(); setDeletingVacaId(vaca.id) }}
                        className="text-gray-300 hover:text-red-400 transition-colors p-1"
                        title="Eliminar vaca"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>
                {vaca.description && <p className="text-sm text-gray-500 mb-3 line-clamp-1">{vaca.description}</p>}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{vaca.collected_crc} / {vaca.target_crc} {t('créditos')}</span>
                    {perFamilyForVaca(vaca) && <span>~{perFamilyForVaca(vaca)} {t('créditos') === 'CRC' ? 'CRC' : 'créd.'}/familia</span>}
                  </div>
                  <div className={`w-full rounded-full h-2 ${isComplete ? 'bg-green-200' : 'bg-gray-100'}`}>
                    <div className={`h-2 rounded-full ${isComplete ? 'bg-green-500' : 'bg-violet-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">{isComplete ? '🎉 ¡Lista!' : 'Tocá para contribuir'}</span>
                    <span className={`font-medium ${isComplete ? 'text-green-600' : 'text-violet-600'}`}>{pct}%</span>
                  </div>
                </div>
              </button>
              </div>
            )
          })
        )}
      </div>

      {isMadrina && (
        <div className="bg-white border-t border-gray-100 px-4 py-3 flex gap-2">
          <button onClick={() => setView('new-vaca')}
            className="flex-1 bg-violet-600 text-white py-3 rounded-xl font-semibold hover:bg-violet-700 text-sm">
            + Nueva vaca
          </button>
          <button onClick={() => setShowInviteModal(true)}
            className="border border-gray-200 text-gray-600 px-4 py-3 rounded-xl font-medium hover:bg-gray-50 text-sm">
            📋 Invitar
          </button>
        </div>
      )}

      {/* Invite modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Invitar a la sala</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-gray-400 text-xl leading-none">×</button>
            </div>
            <p className="text-sm text-gray-500">
              Compartí este link con los padres. Cuando lo abran, podrán pedir acceso a <strong>{sala.name}</strong>.
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
              <p className="text-xs font-mono text-gray-600 break-all select-all">{inviteUrl}</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(inviteUrl)
                setInviteCopied(true)
                setTimeout(() => setInviteCopied(false), 3000)
              }}
              className="w-full bg-violet-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-violet-700 transition-colors"
            >
              {inviteCopied ? '✅ Link copiado al portapapeles!' : '📋 Copiar link de invitación'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
