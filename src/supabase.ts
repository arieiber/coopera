import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export type School = {
  id: string
  name: string
  code: string
  created_at: string
}

export type Sala = {
  id: string
  school_id: string
  name: string
  grade: string
  invite_token: string
  created_at: string
  payout_address: string | null
  payout_ens: string | null
}

export type Member = {
  id: string
  sala_id: string
  email: string
  display_name: string | null
  child_name: string | null
  wallet_address: string | null
  role: 'madrina' | 'parent'
  status: 'pending' | 'approved' | 'rejected'
  joined_at: string
}

/** Returns "Ariel · Papá/Mamá de Juan" or just "Ariel" if no child_name */
export function memberLabel(m: Pick<Member, 'display_name' | 'child_name' | 'email'>): string {
  return m.display_name ?? m.email ?? ''
}
export function memberChildLabel(m: Pick<Member, 'child_name'>): string | null {
  return m.child_name ? `de ${m.child_name}` : null
}

export type OverflowPolicy = 'cap' | 'refund' | 'rollover'
export type VacaStatus = 'active' | 'completed' | 'closed'

export type Vaca = {
  id: string
  sala_id: string
  title: string
  description: string | null
  target_crc: number
  collected_crc: number
  per_family_crc: number | null
  deadline: string
  created_by_email: string
  created_at: string
  status: VacaStatus
  overflow_policy: OverflowPolicy
}

export type Contribution = {
  id: string
  vaca_id: string
  member_email: string
  display_name: string | null
  amount_crc: number
  tx_hash: string | null
  is_demo: boolean
  created_at: string
}
