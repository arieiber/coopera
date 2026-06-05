import { useState, useEffect } from 'react'
import { searchSchools, createSchool, getSalasBySchool, getSalaByToken } from '../db'
import type { School, Sala } from '../supabase'

interface Props {
  onJoinSala: (sala: Sala) => void
  onCreateSala: (school: School) => void
  onOpenSettings: () => void
}

export function HomeScreen({ onJoinSala, onCreateSala, onOpenSettings }: Props) {
  const [query, setQuery] = useState('')
  const [schools, setSchools] = useState<School[]>([])
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null)
  const [salas, setSalas] = useState<Sala[]>([])
  const [loading, setLoading] = useState(false)
  const [inviteToken, setInviteToken] = useState('')
  const [showNewSchool, setShowNewSchool] = useState(false)
  const [newSchoolName, setNewSchoolName] = useState('')
  const [newSchoolCode, setNewSchoolCode] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    // Check if URL has invite token
    const params = new URLSearchParams(window.location.search)
    const token = params.get('invite')
    if (token) setInviteToken(token)
  }, [])

  async function handleSearch() {
    if (!query.trim()) return
    setLoading(true)
    const results = await searchSchools(query.trim())
    setSchools(results)
    setLoading(false)
    if (results.length === 0) setShowNewSchool(true)
  }

  async function handleSelectSchool(school: School) {
    setSelectedSchool(school)
    setShowNewSchool(false)
    const salaList = await getSalasBySchool(school.id)
    setSalas(salaList)
  }

  async function handleJoinByToken() {
    if (!inviteToken.trim()) return
    setLoading(true)
    // Accept full URL or just the token
    let token = inviteToken.trim()
    if (token.includes('?invite=')) {
      token = new URL(token).searchParams.get('invite') ?? token
    }
    const sala = await getSalaByToken(token)
    setLoading(false)
    if (sala) {
      onJoinSala(sala)
    } else {
      setError('Link de invitación inválido o expirado')
    }
  }

  async function handleCreateSchool() {
    if (!newSchoolName.trim() || !newSchoolCode.trim()) return
    setLoading(true)
    try {
      const school = await createSchool(newSchoolName.trim(), newSchoolCode.trim())
      await handleSelectSchool(school)
      setShowNewSchool(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al crear escuela')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto p-4">
      <div className="flex justify-end pt-2 pb-0">
        <button onClick={onOpenSettings} className="text-xl text-gray-400 hover:text-gray-600 px-1" title="Configuración">⚙️</button>
      </div>
      <div className="text-center py-6 space-y-2">
        <img src="/logo.png" alt="Coopera" className="w-24 h-24 mx-auto rounded-full shadow-md" />
        <h1 className="text-2xl font-bold text-gray-900">Coopera</h1>
        <p className="text-gray-500 text-sm">La cooperadora digital de tu sala</p>
      </div>

      {/* Join by invite link */}
      <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 mb-4 space-y-3">
        <p className="text-sm font-semibold text-violet-800">¿Tenés un link de invitación?</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Pegá el link o token de invitación"
            value={inviteToken}
            onChange={e => setInviteToken(e.target.value)}
            className="flex-1 border border-violet-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-violet-400 bg-white"
          />
          <button
            onClick={handleJoinByToken}
            disabled={loading || !inviteToken.trim()}
            className="bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            Entrar
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      <div className="text-center text-gray-400 text-xs mb-4">— o buscá tu escuela —</div>

      {/* School search */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Nombre o código de escuela"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="bg-gray-900 text-white px-4 py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
        >
          Buscar
        </button>
      </div>

      {/* School results */}
      {schools.length > 0 && !selectedSchool && (
        <div className="space-y-2 mb-4">
          {schools.map(s => (
            <button
              key={s.id}
              onClick={() => handleSelectSchool(s)}
              className="w-full text-left bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-violet-300 transition-colors"
            >
              <p className="font-semibold text-gray-900 text-sm">{s.name}</p>
              <p className="text-xs text-gray-400">Código: {s.code}</p>
            </button>
          ))}
        </div>
      )}

      {/* Salas of selected school */}
      {selectedSchool && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">{selectedSchool.name}</p>
              <p className="text-xs text-gray-400">Código: {selectedSchool.code}</p>
            </div>
            <button onClick={() => { setSelectedSchool(null); setSchools([]) }} className="text-xs text-gray-400 hover:text-gray-600">
              Cambiar
            </button>
          </div>

          {salas.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No hay salas todavía</p>
          ) : (
            salas.map(sala => (
              <button
                key={sala.id}
                onClick={() => onJoinSala(sala)}
                className="w-full text-left bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-violet-300 transition-colors"
              >
                <p className="font-semibold text-gray-900 text-sm">{sala.name}</p>
                <p className="text-xs text-gray-400">{sala.grade}</p>
              </button>
            ))
          )}

          <button
            onClick={() => onCreateSala(selectedSchool)}
            className="w-full border-2 border-dashed border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-500 hover:border-violet-300 hover:text-violet-600 transition-colors"
          >
            + Crear nueva sala
          </button>
        </div>
      )}

      {/* Create new school */}
      {showNewSchool && !selectedSchool && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 mt-2">
          <p className="text-sm font-semibold text-gray-800">No encontramos tu escuela. ¿La agregamos?</p>
          <input
            type="text"
            placeholder="Nombre completo de la escuela"
            value={newSchoolName}
            onChange={e => setNewSchoolName(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400"
          />
          <input
            type="text"
            placeholder="Código corto (ej: ESC15)"
            value={newSchoolCode}
            onChange={e => setNewSchoolCode(e.target.value.toUpperCase())}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400"
          />
          <button
            onClick={handleCreateSchool}
            disabled={!newSchoolName.trim() || !newSchoolCode.trim() || loading}
            className="w-full bg-violet-600 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50"
          >
            Agregar escuela
          </button>
        </div>
      )}
    </div>
  )
}
