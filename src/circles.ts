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

/** Returns the total CRC balance for an address, in CRC units. */
export async function getCrcBalance(address: string): Promise<number> {
  try {
    const avatar = await sdk.getAvatar(address as `0x${string}`)
    const totalWei = await avatar.balances.getTotal()
    return Number(totalWei) / 1e18
  } catch {
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
    // Demo mode: just log, don't throw
    console.log(`[demo] sendCrc ${amountCrc} CRC → ${to}`)
    return
  }
  const runner = createMiniappRunner(fromAddress)
  const sdkWithRunner = new Sdk(undefined, runner)
  const avatar = await sdkWithRunner.getAvatar(fromAddress as `0x${string}`)
  // transfer.advanced uses pathfinding through the trust graph — real Circles primitive
  await avatar.transfer.advanced(to as `0x${string}`, amountCrc)
}
