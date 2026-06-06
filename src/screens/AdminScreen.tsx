import { useState, useEffect } from 'react'
import {
  adminGetAllSchools, adminGetAllSalas,
  adminDeleteMember, adminDeleteSala, adminDeleteSchool,
  getMembers, getVacas, deleteVaca, updateMemberStatus,
} from '../db'
import type { School, Sala, Member, Vaca } from '../supabase'

type Tab = 'schools' | 'salas' | 'members' | 'vacas'

interface SalaWithSchool extends Sala { school_name?: string }

export function AdminScreen({ onExit }: { onExit: () => void }) {
  const [tab, setTab] = useState<Tab>('salas')
  const [schools, setSchools] = useState<School[]>([])
  const [salas, setSalas] = useState<SalaWithSchool[]>([])
  const [selectedSala, setSelectedSala] = useState<SalaWithSchool | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [vacas, setVacas] = useState<Vaca[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [confirm, setConfirm] = useState<{ type: string; id: string; label: string } | null>(null)

  useEffect(() => { loadAll() }, [])
  useEffect(() => {
    if (selectedSala) {
      getMembers(selectedSala.id).then(setMembers)
      getVacas(selectedSala.id).then(setVacas)
    }
  }, [selectedSala])

  async function loadAll() {
    setLoading(true)
    const [s, sl] = await Promise.all([adminGetAllSchools(), adminGetAllSalas()])
    setSchools(s)
    setSalas(sl)
    setLoading(false)
  }

  async function doConfirm() {
    if (!confirm) return
    try {
      if (confirm.type === 'member') await adminDeleteMember(confirm.id)
      if (confirm.type === 'sala') { await adminDeleteSala(confirm.id); await loadAll(); setSelectedSala(null) }
      if (confirm.type === 'school') { await adminDeleteSchool(confirm.id); await loadAll() }
      if (confirm.type === 'vaca') { await deleteVaca(confirm.id); if (selectedSala) getVacas(selectedSala.id).then(setVacas) }
      if (confirm.type === 'approve') { await updateMemberStatus(confirm.id, 'approved'); if (selectedSala) getMembers(selectedSala.id).then(setMembers) }
      if (confirm.type === 'reject') { await updateMemberStatus(confirm.id, 'rejected'); if (selectedSala) getMembers(selectedSala.id).then(setMembers) }
      setConfirm(null)
    } catch (e) { alert(e instanceof Error ? e.message : 'Error') }
  }

  const filteredSalas = salas.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.school_name ?? '').toLowerCase().includes(search.toLowerCase())
  )
  const filteredSchools = schools.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase())
  )

  const pending = members.filter(m => m.status === 'pending')
  const approved = members.filter(m => m.status === 'approved')

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔑</span>
          <span className="font-bold text-sm text-gray-100">Coopera Admin</span>
          <span className="text-xs bg-red-900 text-red-300 px-2 py-0.5 rounded-full">master</span>
        </div>
        <button onClick={onExit} className="text-xs text-gray-500 hover:text-gray-300">← Salir</button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 border-b border-gray-800 bg-gray-900">
        {[
          { label: 'Escuelas', val: schools.length },
          { label: 'Salas', val: salas.length },
          { label: 'Pendientes', val: salas.length > 0 ? '?' : 0 },
        ].map(s => (
          <div key={s.label} className="px-4 py-2 text-center border-r border-gray-800 last:border-0">
            <div className="text-xl font-bold text-violet-400">{s.val}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 bg-gray-900 px-2">
        {(['salas', 'schools'] as Tab[]).map(t => (
          <button key={t} onClick={() => { setTab(t); setSelectedSala(null); setSearch('') }}
            className={`px-4 py-2 text-xs font-medium capitalize transition-colors ${tab === t ? 'text-violet-400 border-b-2 border-violet-400' : 'text-gray-500 hover:text-gray-300'}`}>
            {t === 'salas' ? 'Salas' : 'Escuelas'}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-4 py-2 bg-gray-900 border-b border-gray-800">
        <input
          type="text" placeholder="Buscar..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-violet-500"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-600 text-sm">Cargando...</div>
        ) : selectedSala ? (
          /* ── Sala detail ── */
          <div className="p-4 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-100">{selectedSala.name}</h2>
                <p className="text-xs text-gray-500">{selectedSala.school_name} · {selectedSala.grade}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setConfirm({ type: 'sala', id: selectedSala.id, label: `sala "${selectedSala.name}"` })}
                  className="text-xs text-red-400 border border-red-800 px-2 py-1 rounded-lg hover:bg-red-900/30">
                  Eliminar sala
                </button>
                <button onClick={() => setSelectedSala(null)} className="text-xs text-gray-500 hover:text-gray-300">← Volver</button>
              </div>
            </div>

            {/* Pending members */}
            {pending.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-yellow-400 mb-2 uppercase tracking-wide">
                  Solicitudes pendientes ({pending.length})
                </h3>
                <div className="space-y-2">
                  {pending.map(m => (
                    <div key={m.id} className="flex items-center justify-between bg-gray-800 rounded-xl px-3 py-2.5">
                      <div>
                        <p className="text-sm text-gray-100">{m.display_name ?? m.email}</p>
                        <p className="text-xs text-gray-500">{m.email}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setConfirm({ type: 'approve', id: m.id, label: `aprobar a ${m.display_name}` })}
                          className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded-lg hover:bg-green-800">✓ Aprobar</button>
                        <button onClick={() => setConfirm({ type: 'reject', id: m.id, label: `rechazar a ${m.display_name}` })}
                          className="text-xs bg-red-900/50 text-red-400 px-2 py-1 rounded-lg hover:bg-red-900">✗</button>
                        <button onClick={() => setConfirm({ type: 'member', id: m.id, label: `eliminar a ${m.display_name}` })}
                          className="text-xs text-gray-600 hover:text-red-400 px-1">🗑</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Approved members */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                Miembros aprobados ({approved.length})
              </h3>
              <div className="space-y-1.5">
                {approved.map(m => (
                  <div key={m.id} className="flex items-center justify-between bg-gray-800/50 rounded-xl px-3 py-2">
                    <div>
                      <span className="text-sm text-gray-300">{m.display_name ?? m.email}</span>
                      <span className="ml-2 text-xs text-gray-600">{m.role === 'madrina' ? '⭐' : ''}</span>
                      {m.wallet_address && <span className="ml-2 text-xs text-green-600">● Circles</span>}
                    </div>
                    <button onClick={() => setConfirm({ type: 'member', id: m.id, label: `eliminar a ${m.display_name}` })}
                      className="text-xs text-gray-700 hover:text-red-400 px-1">🗑</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Vacas */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                Vacas ({vacas.length})
              </h3>
              <div className="space-y-2">
                {vacas.map(v => {
                  const pct = Math.min(100, Math.round((v.collected_crc / v.target_crc) * 100))
                  return (
                    <div key={v.id} className="bg-gray-800/50 rounded-xl px-3 py-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                            v.status === 'completed' ? 'bg-green-900 text-green-400' :
                            v.status === 'closed' ? 'bg-gray-700 text-gray-400' :
                            'bg-violet-900 text-violet-400'
                          }`}>{v.status}</span>
                          <span className="text-sm text-gray-200">{v.title}</span>
                        </div>
                        <button onClick={() => setConfirm({ type: 'vaca', id: v.id, label: `eliminar vaca "${v.title}"` })}
                          className="text-xs text-gray-700 hover:text-red-400 px-1">🗑</button>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 bg-gray-700 rounded-full h-1.5">
                          <div className="bg-violet-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{v.collected_crc}/{v.target_crc} CRC</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : tab === 'salas' ? (
          /* ── Salas list ── */
          <div className="divide-y divide-gray-800">
            {filteredSalas.map(s => (
              <button key={s.id} onClick={() => setSelectedSala(s)}
                className="w-full text-left px-4 py-3 hover:bg-gray-800/50 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-100">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.school_name} · {s.grade}</p>
                </div>
                <span className="text-gray-600 text-sm">→</span>
              </button>
            ))}
            {filteredSalas.length === 0 && (
              <p className="text-center text-gray-600 text-sm py-12">Sin resultados</p>
            )}
          </div>
        ) : (
          /* ── Schools list ── */
          <div className="divide-y divide-gray-800">
            {filteredSchools.map(s => (
              <div key={s.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-100">{s.name}</p>
                  <p className="text-xs text-gray-500 font-mono">{s.code}</p>
                </div>
                <button onClick={() => setConfirm({ type: 'school', id: s.id, label: `eliminar escuela "${s.name}"` })}
                  className="text-xs text-gray-700 hover:text-red-400 px-2">🗑</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm modal */}
      {confirm && (
        <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-5 space-y-4">
            <p className="text-sm font-semibold text-gray-100">¿Confirmar acción?</p>
            <p className="text-xs text-gray-400 bg-gray-800 rounded-xl px-3 py-2">
              {confirm.type === 'approve' ? `✓ Aprobar: ` :
               confirm.type === 'reject' ? `✗ Rechazar: ` : `🗑 Eliminar: `}
              <span className="text-gray-200">{confirm.label}</span>
            </p>
            <p className="text-xs text-red-400">Esta acción no involucra movimiento de créditos.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirm(null)}
                className="flex-1 border border-gray-700 text-gray-400 py-2 rounded-xl text-sm">
                Cancelar
              </button>
              <button onClick={doConfirm}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold ${
                  confirm.type === 'approve' ? 'bg-green-700 text-green-100' : 'bg-red-700 text-red-100'
                }`}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
