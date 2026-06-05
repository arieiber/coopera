import { usePrefs } from '../prefs'

interface Props {
  onBack: () => void
  onLogout: () => void
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${on ? 'bg-violet-600' : 'bg-gray-200 dark:bg-gray-700'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  )
}

function Row({ label, sub, on, onToggle }: { label: string; sub?: string; on: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium coop-text">{label}</p>
        {sub && <p className="text-xs coop-muted mt-0.5">{sub}</p>}
      </div>
      <Toggle on={on} onToggle={onToggle} />
    </div>
  )
}

export function SettingsScreen({ onBack, onLogout }: Props) {
  const { darkMode, techMode, toggleDark, toggleTech } = usePrefs()

  return (
    <div className="min-h-screen coop-page flex flex-col max-w-md mx-auto">
      <div className="flex items-center gap-3 p-4 coop-card border-b coop-border">
        <button onClick={onBack} className="coop-muted">←</button>
        <h2 className="font-semibold coop-text">Configuración</h2>
      </div>

      <div className="flex-1 p-4 space-y-4">

        {/* Apariencia */}
        <div className="coop-card border rounded-2xl p-4 space-y-4">
          <p className="text-xs font-semibold coop-muted uppercase tracking-wider">Apariencia</p>
          <Row
            label={darkMode ? '🌙 Modo oscuro' : '☀️ Modo claro'}
            sub="Cambia el tema visual de la app"
            on={darkMode}
            onToggle={toggleDark}
          />
        </div>

        {/* Avanzado */}
        <div className="coop-card border rounded-2xl p-4 space-y-4">
          <p className="text-xs font-semibold coop-muted uppercase tracking-wider">Avanzado</p>
          <Row
            label="Modo web3"
            sub={techMode
              ? 'Mostrando términos técnicos: CRC, wallet, ENS...'
              : 'Mostrando términos simples: créditos, cuenta digital...'}
            on={techMode}
            onToggle={toggleTech}
          />
          {techMode && (
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                ⚠️ Modo web3 activado. Estás viendo la terminología técnica de la app. Desactivá si otros van a usar el dispositivo.
              </p>
            </div>
          )}
        </div>

        {/* Acerca de */}
        <div className="coop-card border rounded-2xl p-4 space-y-2">
          <p className="text-xs font-semibold coop-muted uppercase tracking-wider">Acerca de</p>
          <div className="space-y-1">
            <p className="text-sm coop-text font-medium">Coopera</p>
            <p className="text-xs coop-muted">La cooperadora digital de tu sala</p>
            <p className="text-xs coop-muted">Versión 0.1 · Hackathon Circles 2026</p>
          </div>
        </div>

        {/* Cerrar sesión */}
        <button
          onClick={onLogout}
          className="w-full border border-red-200 dark:border-red-900 text-red-500 dark:text-red-400 py-3 rounded-2xl text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
