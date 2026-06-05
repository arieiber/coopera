interface Props {
  displayName: string
  salaName: string
  onLogout: () => void
}

export function PendingScreen({ displayName, salaName, onLogout }: Props) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center max-w-md mx-auto p-8 text-center space-y-6">
      <div className="text-5xl">⏳</div>
      <div className="space-y-2">
        <h2 className="font-bold text-gray-900 text-xl">Solicitud enviada, {displayName.split(' ')[0]}!</h2>
        <p className="text-gray-500 text-sm">
          La madrina de <strong>{salaName}</strong> tiene que aprobar tu ingreso.
          Te avisamos cuando esté listo.
        </p>
      </div>
      <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 space-y-2 text-left">
        <p className="text-sm font-semibold text-violet-800">¿Qué pasa mientras tanto?</p>
        <ul className="text-sm text-violet-700 space-y-1">
          <li>📬 La madrina recibe tu solicitud</li>
          <li>✅ Una vez que te apruebe, podés entrar y contribuir a las colectas</li>
          <li>🔁 Volvé a abrir la app después de que te avisen</li>
        </ul>
      </div>
      <button onClick={onLogout} className="text-sm text-gray-400 hover:text-gray-600">
        Volver al inicio
      </button>
    </div>
  )
}
