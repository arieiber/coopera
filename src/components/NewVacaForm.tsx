import { useState } from 'react'

interface Props {
  onSubmit: (title: string, description: string, targetCrc: number, deadline: string) => void
  onCancel: () => void
}

export function NewVacaForm({ onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [target, setTarget] = useState('')
  const [deadline, setDeadline] = useState('')

  const minDate = new Date().toISOString().split('T')[0]

  function handleSubmit() {
    if (!title.trim() || !target || !deadline) return
    onSubmit(title.trim(), description.trim(), parseFloat(target), deadline)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-gray-100">
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-900">←</button>
        <h2 className="font-semibold text-gray-900 text-lg">Nueva vaca</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">¿Para qué es?</label>
          <input
            type="text"
            placeholder="Ej: Pañales para la semana"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Detalle (opcional)</label>
          <textarea
            placeholder="Ej: Talle M, marca Huggies"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400 resize-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Meta en CRC</label>
          <input
            type="number"
            min="1"
            placeholder="Ej: 200"
            value={target}
            onChange={e => setTarget(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400"
          />
          <p className="text-xs text-gray-400 mt-1">1 CRC se acumula por hora por billetera</p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Fecha límite</label>
          <input
            type="date"
            min={minDate}
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400"
          />
        </div>
      </div>

      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleSubmit}
          disabled={!title.trim() || !target || !deadline}
          className="w-full bg-violet-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50 hover:bg-violet-700 transition-colors"
        >
          Crear vaca 🐄
        </button>
      </div>
    </div>
  )
}
