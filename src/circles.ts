import { isMiniappMode, onWalletChange, sendTransactions } from '@aboutcircles/miniapp-sdk'
import { createPublicClient, http } from 'viem'
import { gnosis } from 'viem/chains'
import { Sdk } from '@aboutcircles/sdk'
import type { ContractRunner } from '@aboutcircles/sdk-types'

export { isMiniappMode }

export function subscribeWallet(cb: (address: string | null) => void): () => void {
  return onWalletChange(cb)
}

// ── Public client (read-only) ─────────────────────────────────────────────────
const publicClient = createPublicClient({
  chain: gnosis,
  transport: http('https://rpc.gnosischain.com'),
})

// ── Read-only SDK (no runner needed for balance/trust queries) ────────────────
const sdk = new Sdk()

/** Returns the Circles profile name for an address, or null if not found. */
export async function getCirclesProfile(address: string): Promise<{ name: string } | null> {
  try {
    const avatar = await sdk.getAvatar(address as `0x${string}`)
    const profile = await avatar.profile.get()
    if (profile?.name) return { name: profile.name }
    return null
  } catch {
    return null
  }
}

/** Returns the total CRC balance for an address, in CRC units.
 *
 * Calls the Circles RPC directly — the SDK's getTotal() only counts ERC1155
 * native tokens and misses ERC20-wrapped CRC received via trust-graph transfers.
 * circles_getTokenBalances returns all token types with their attoCircles value.
 */
export async function getCrcBalance(address: string): Promise<number> {
  try {
    const res = await fetch('https://rpc.aboutcircles.com/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'circles_getTokenBalances',
        params: [address],
        id: 1,
      }),
    })
    const json = await res.json()
    if (!json.result || !Array.isArray(json.result)) return 0
    const tokens: Array<{ attoCircles: string }> = json.result
    const totalAtto = tokens.reduce((sum, t) => sum + BigInt(t.attoCircles ?? '0'), 0n)
    return Number(totalAtto) / 1e18
  } catch (e) {
    console.error('[circles] getCrcBalance error:', e)
    return 0
  }
}

// ── ContractRunner that bridges the Circles SDK → Circles Garage miniapp ─────
// The SDK builds the transaction; the Garage wallet signs and broadcasts it.
function createMiniappRunner(address: string): ContractRunner {
  return {
    address: address as `0x${string}`,
    publicClient,
    init: async () => {},
    sendTransaction: async (txs) => {
      await sendTransactions(
        txs.map(tx => ({
          to: tx.to as string,
          data: tx.data as string,
          value: tx.value ? `0x${tx.value.toString(16)}` : '0x0',
        }))
      )
      // miniapp-sdk doesn't return a receipt — return minimal shape
      return { status: 'success', transactionHash: '0x' }
    },
  }
}

// ── Trust ─────────────────────────────────────────────────────────────────────
/**
 * Called when madrina approves a member.
 * The madrina's wallet adds a Circles trust to the member's wallet.
 * This is a real Circles primitive — it enables future transfers through the trust graph.
 */
export async function trustMember(
  madrinalAddress: string,
  memberAddress: string
): Promise<void> {
  if (!isMiniappMode()) return // no-op in demo mode
  const runner = createMiniappRunner(madrinalAddress)
  const sdkWithRunner = new Sdk(undefined, runner)
  const avatar = await sdkWithRunner.getAvatar(madrinalAddress as `0x${string}`)
  await avatar.trust.add(memberAddress as `0x${string}`)
}

// ── Transfer via pathfinding ──────────────────────────────────────────────────
/**
 * Sends CRC using the Circles trust graph (pathfinding).
 * This is the correct Circles-native way to transfer — it routes through
 * the trust network instead of a single-hop direct transfer.
 */
export async function sendCrc(
  fromAddress: string,
  to: string,
  amountCrc: number
): Promise<void> {
  if (!isMiniappMode()) {
    console.log(`[demo] sendCrc ${amountCrc} CRC → ${to}`)
    return
  }
  // Self-contribution: madrina is both sender and payout address.
  // Circles cannot transfer to itself — but the contribution is still valid:
  // the madrina already holds the CRC, so no movement is needed.
  if (fromAddress.toLowerCase() === to.toLowerCase()) {
    console.log(`[circles] self-contribution: ${amountCrc} CRC — skipping tx (from === to)`)
    return
  }
  const runner = createMiniappRunner(fromAddress)
  const sdkWithRunner = new Sdk(undefined, runner)
  const avatar = await sdkWithRunner.getAvatar(fromAddress as `0x${string}`)
  // transfer.advanced uses pathfinding through the trust graph — real Circles primitive
  // Convert to BigInt wei (18 decimals) to avoid "cannot convert float to BigInt" error
  const amountWei = BigInt(Math.round(amountCrc * 1e18))
  await avatar.transfer.advanced(to as `0x${string}`, amountWei)
}
