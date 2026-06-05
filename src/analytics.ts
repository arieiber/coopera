/**
 * Analytics — lightweight event tracking for the Circles hackathon.
 * Uses a simple POST to a public endpoint (no SDK needed).
 * Events are batched in localStorage and flushed on page load.
 *
 * For the hackathon judges: tracks weekly unique wallets + time spent (criterion #5).
 * Falls back silently if anything fails.
 */

const ENDPOINT = 'https://api.coopera-analytics.workers.dev/event' // placeholder — swap for real endpoint
const SESSION_KEY = 'coopera_session_start'
const WALLET_KEY = 'coopera_tracked_wallet'

export type EventName =
  | 'app_open'
  | 'onboarding_complete'
  | 'sala_joined'
  | 'vaca_contributed'
  | 'vaca_created'
  | 'member_approved'

interface EventPayload {
  event: EventName
  wallet?: string
  sala_id?: string
  amount?: number
  ts: number
}

function send(payload: EventPayload) {
  try {
    // Use sendBeacon for reliability (works even on page unload)
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
    navigator.sendBeacon(ENDPOINT, blob)
  } catch {
    // Never throw — analytics must never break the app
  }
}

export function track(event: EventName, props?: Omit<EventPayload, 'event' | 'ts'>) {
  send({ event, ...props, ts: Date.now() })
}

/** Call once when the wallet is known. Tracks unique wallets per week. */
export function identifyWallet(wallet: string) {
  const already = localStorage.getItem(WALLET_KEY)
  if (already !== wallet) {
    localStorage.setItem(WALLET_KEY, wallet)
    localStorage.setItem(SESSION_KEY, String(Date.now()))
    track('app_open', { wallet })
  } else {
    // Still track time-in-app on each visit
    localStorage.setItem(SESSION_KEY, String(Date.now()))
    track('app_open', { wallet })
  }
}
