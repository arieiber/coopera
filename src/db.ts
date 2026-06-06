import { supabase } from './supabase'
import type { School, Sala, Member, Vaca, Contribution, OverflowPolicy, VacaStatus } from './supabase'

// ── Schools ──────────────────────────────────────────────────────────────────

export async function searchSchools(query: string): Promise<School[]> {
  const { data } = await supabase
    .from('schools')
    .select('*')
    .or(`name.ilike.%${query}%,code.ilike.%${query}%`)
    .limit(10)
  return data ?? []
}

export async function createSchool(name: string, code: string): Promise<School> {
  const { data, error } = await supabase
    .from('schools')
    .insert({ name, code: code.toUpperCase() })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

// ── Salas ─────────────────────────────────────────────────────────────────────

export async function getSalasBySchool(schoolId: string): Promise<Sala[]> {
  const { data } = await supabase
    .from('salas')
    .select('*')
    .eq('school_id', schoolId)
    .order('name')
  return data ?? []
}

export async function getSalaByToken(token: string): Promise<Sala | null> {
  const { data } = await supabase
    .from('salas')
    .select('*')
    .eq('invite_token', token)
    .single()
  return data ?? null
}

export async function updateSalaPayoutAddress(salaId: string, payoutAddress: string, payoutEns?: string): Promise<void> {
  const { error } = await supabase.from('salas').update({
    payout_address: payoutAddress,
    payout_ens: payoutEns ?? null,
  }).eq('id', salaId)
  if (error) throw new Error(error.message)
}

export async function createSala(schoolId: string, name: string, grade: string): Promise<Sala> {
  const { data, error } = await supabase
    .from('salas')
    .insert({ school_id: schoolId, name, grade })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

// ── Members ───────────────────────────────────────────────────────────────────

export async function getMembers(salaId: string): Promise<Member[]> {
  const { data } = await supabase
    .from('members')
    .select('*')
    .eq('sala_id', salaId)
    .order('joined_at')
  return data ?? []
}

export async function getMember(salaId: string, email: string): Promise<Member | null> {
  const { data } = await supabase
    .from('members')
    .select('*')
    .eq('sala_id', salaId)
    .eq('email', email)
    .single()
  return data ?? null
}

export async function requestJoin(salaId: string, email: string, displayName: string, asMadrina = false): Promise<Member> {
  const existing = await getMember(salaId, email)
  if (existing) return existing

  const { data, error } = await supabase
    .from('members')
    .insert({
      sala_id: salaId,
      email,
      display_name: displayName,
      role: asMadrina ? 'madrina' : 'parent',
      status: asMadrina ? 'approved' : 'pending',
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateMemberStatus(memberId: string, status: 'approved' | 'rejected'): Promise<void> {
  const { error } = await supabase
    .from('members')
    .update({ status })
    .eq('id', memberId)
  if (error) throw new Error(error.message)
}

export async function updateMemberRole(memberId: string, role: 'madrina' | 'parent'): Promise<void> {
  const { error } = await supabase
    .from('members')
    .update({ role })
    .eq('id', memberId)
  if (error) throw new Error(error.message)
}

export async function updateMemberWallet(memberId: string, wallet: string): Promise<void> {
  const { error } = await supabase
    .from('members')
    .update({ wallet_address: wallet })
    .eq('id', memberId)
  if (error) throw new Error(error.message)
}

// ── Vacas ─────────────────────────────────────────────────────────────────────

export async function getVacas(salaId: string): Promise<Vaca[]> {
  const { data } = await supabase
    .from('vacas')
    .select('*')
    .eq('sala_id', salaId)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function createVaca(
  salaId: string, title: string, description: string,
  targetCrc: number, deadline: string, createdByEmail: string,
  overflowPolicy: OverflowPolicy = 'cap',
  perFamilyCrc?: number,
): Promise<Vaca> {
  const { data, error } = await supabase
    .from('vacas')
    .insert({
      sala_id: salaId, title, description,
      target_crc: targetCrc, deadline,
      created_by_email: createdByEmail,
      overflow_policy: overflowPolicy,
      per_family_crc: perFamilyCrc ?? null,
      status: 'active',
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteVaca(vacaId: string): Promise<void> {
  await supabase.from('contributions').delete().eq('vaca_id', vacaId)
  const { error } = await supabase.from('vacas').delete().eq('id', vacaId)
  if (error) throw new Error(error.message)
}

export async function updateVacaStatus(vacaId: string, status: VacaStatus): Promise<void> {
  const { error } = await supabase.from('vacas').update({ status }).eq('id', vacaId)
  if (error) throw new Error(error.message)
}

// ── Contributions ─────────────────────────────────────────────────────────────

export async function getContributions(vacaId: string): Promise<Contribution[]> {
  const { data } = await supabase
    .from('contributions')
    .select('*')
    .eq('vaca_id', vacaId)
    .order('created_at')
  return data ?? []
}

// Returns the actual amount contributed (may be capped)
export async function addContribution(vacaId: string, memberEmail: string, displayName: string, amountCrc: number, txHash?: string, isDemo = false): Promise<number> {
  const { data: vaca } = await supabase
    .from('vacas')
    .select('collected_crc, target_crc, overflow_policy, status')
    .eq('id', vacaId)
    .single()

  if (!vaca || vaca.status !== 'active') throw new Error('Esta vaca ya no está activa')

  // Cap at 100% if policy is 'cap'
  let actual = amountCrc
  if (vaca.overflow_policy === 'cap') {
    const remaining = vaca.target_crc - vaca.collected_crc
    if (remaining <= 0) throw new Error('La vaca ya está completa')
    actual = Math.min(amountCrc, remaining)
  }

  const { error: contribError } = await supabase
    .from('contributions')
    .insert({ vaca_id: vacaId, member_email: memberEmail, display_name: displayName, amount_crc: actual, tx_hash: txHash ?? null, is_demo: isDemo })
  if (contribError) throw new Error(contribError.message)

  const newTotal = vaca.collected_crc + actual
  const isComplete = newTotal >= vaca.target_crc

  await supabase.from('vacas').update({
    collected_crc: newTotal,
    ...(isComplete ? { status: 'completed' } : {}),
  }).eq('id', vacaId)

  return actual
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function adminGetAllSchools(): Promise<School[]> {
  const { data } = await supabase.from('schools').select('*').order('name')
  return data ?? []
}

export async function adminGetAllSalas(): Promise<(Sala & { school_name?: string })[]> {
  const { data } = await supabase
    .from('salas')
    .select('*, schools(name)')
    .order('name')
  return (data ?? []).map((s: any) => ({ ...s, school_name: s.schools?.name }))
}

export async function adminDeleteMember(memberId: string): Promise<void> {
  const { error } = await supabase.from('members').delete().eq('id', memberId)
  if (error) throw new Error(error.message)
}

export async function adminDeleteSala(salaId: string): Promise<void> {
  const { error } = await supabase.from('salas').delete().eq('id', salaId)
  if (error) throw new Error(error.message)
}

export async function adminDeleteSchool(schoolId: string): Promise<void> {
  const { error } = await supabase.from('schools').delete().eq('id', schoolId)
  if (error) throw new Error(error.message)
}
