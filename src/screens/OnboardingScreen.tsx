import { useState } from 'react'

interface Props {
  onDone: () => void
}

type Step = {
  emoji: string
  title: string
  body?: string
  sub?: string
  sub2?: string
  bullets?: { icon: string; text: string }[]
}

const STEPS: Step[] = [
  {
    emoji: '🏫',
    title: 'La cooperadora digital de tu sala',
    body: 'Coopera es la forma más fácil de organizar colectas entre los papás de la sala. Sin grupos de WhatsApp caóticos, sin plata en efectivo dando vueltas.',
    sub: 'Usada por grupos de padres en jardines y escuelas de toda Argentina.',
  },
  {
    emoji: '🪙',
    title: 'Los créditos son plata real',
    body: 'Los créditos se acumulan solos con el tiempo — y tienen valor de verdad. Se pueden convertir en pesos para pagar las compras de la sala.',
    sub2: '¿Cómo es posible? Los créditos forman parte de una red de confianza entre personas: cuanto más participás, más acumulás. No es magia — es una nueva forma de organizar plata en grupo que ya usan miles de personas en el mundo.',
  },
  {
    emoji: '✅',
    title: 'Así funciona',
    body: undefined,
    bullets: [
      { icon: '📋', text: 'La madrina crea una colecta con el monto necesario' },
      { icon: '💸', text: 'Cada familia contribuye según puede' },
      { icon: '🎯', text: 'Cuando se alcanza la meta, la madrina recibe los fondos y hace la compra' },
      { icon: '📦', text: 'La escuela recibe lo que necesitaba — sin mensajitos de comprobantes ni confusión' },
    ],
  },
]

export function OnboardingScreen({ onDone }: Props) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto">
      {/* Progress dots */}
      <div className="flex justify-center gap-2 pt-10 pb-4">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === step ? 'w-6 h-2 bg-violet-600' : 'w-2 h-2 bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center space-y-6">
        <div className="w-28 h-28 rounded-full bg-violet-50 flex items-center justify-center text-6xl">
          {current.emoji}
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">{current.title}</h1>
          {current.body && (
            <p className="text-gray-500 text-base leading-relaxed">{current.body}</p>
          )}
          {current.bullets && (
            <div className="text-left space-y-3 mt-4">
              {current.bullets.map((b, i) => (
                <div key={i} className="flex items-start gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3">
                  <span className="text-xl shrink-0">{b.icon}</span>
                  <p className="text-sm text-gray-700 leading-snug">{b.text}</p>
                </div>
              ))}
            </div>
          )}
          {current.sub && (
            <p className="text-xs text-gray-400 pt-2">{current.sub}</p>
          )}
          {current.sub2 && (
            <div className="bg-violet-50 border border-violet-100 rounded-2xl px-4 py-3 text-left mt-2">
              <p className="text-xs text-violet-700 leading-relaxed">{current.sub2}</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 space-y-3">
        <button
          onClick={() => isLast ? onDone() : setStep(s => s + 1)}
          className="w-full bg-violet-600 text-white py-4 rounded-2xl font-semibold text-base hover:bg-violet-700 transition-colors shadow-sm"
        >
          {isLast ? '¡Empezar! 🚀' : 'Siguiente →'}
        </button>
        {!isLast && (
          <button
            onClick={onDone}
            className="w-full text-sm text-gray-400 hover:text-gray-600 py-1"
          >
            Saltear
          </button>
        )}
      </div>
    </div>
  )
}
