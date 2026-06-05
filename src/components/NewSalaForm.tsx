import { useState } from 'react'

interface Props {
  onSubmit: (name: string, school: string, grade: string) => void
}

export function NewSalaForm({ onSubmit }: Props) {
  const [name, setName] = useState('')
  const [school, setSchool] = useState('')
  const [grade, setGrade] = useState('')

  function handleSubmit() {
    if (!name.trim() || !school.trim() || !grade.trim()) return
    onSubmit(name.trim(), school.trim(), grade.trim())
  }

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex-1 flex flex-col justify-center space-y-6">
        <div className="text-center space-y-2">
          <div className="text-5xl">🏫</div>
          <h1 className="text-2xl font-bold text-gray-900">Bienvenido a Coopera</h1>
          <p className="text-gray-500 text-sm">Creá el grupo de tu sala o grado para empezar</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Nombre del grupo</label>
            <input
              type="text"
              placeholder="Ej: Sala Roja"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Escuela</label>
            <input
              type="text"
              placeholder="Ej: Jardín N°15 Rayito de Sol"
              value={school}
              onChange={e => setSchool(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Sala / Grado</label>
            <input
              type="text"
              placeholder="Ej: Sala de 3 años turno mañana"
              value={grade}
              onChange={e => setGrade(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400"
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!name.trim() || !school.trim() || !grade.trim()}
        className="w-full bg-violet-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50 hover:bg-violet-700 transition-colors mt-4"
      >
        Crear sala
      </button>
    </div>
  )
}
