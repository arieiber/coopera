import type { Vaca } from '../types'

interface Props {
  vaca: Vaca
  onClick: () => void
}

export function VacaCard({ vaca, onClick }: Props) {
  const pct = Math.min(100, Math.round((vaca.collectedCrc / vaca.targetCrc) * 100))
  const daysLeft = Math.ceil((new Date(vaca.deadline).getTime() - Date.now()) / 86400000)

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-semibold text-gray-900 text-base leading-tight">{vaca.title}</h3>
        <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${daysLeft <= 2 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {daysLeft > 0 ? `${daysLeft}d` : 'Vencida'}
        </span>
      </div>

      {vaca.description && (
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{vaca.description}</p>
      )}

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>{vaca.collectedCrc} CRC juntados</span>
          <span>Meta: {vaca.targetCrc} CRC</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="bg-violet-500 h-2 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">{vaca.contributions.length} contribuciones</span>
          <span className="font-medium text-violet-600">{pct}%</span>
        </div>
      </div>
    </button>
  )
}
