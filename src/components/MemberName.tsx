import type { Member } from '../supabase'

interface Props {
  member: Pick<Member, 'display_name' | 'child_name' | 'email'>
  size?: 'sm' | 'base'
}

/**
 * Renders "Ariel" + " · de Juan" (grayed out)
 * Falls back to email if no display_name.
 */
export function MemberName({ member, size = 'base' }: Props) {
  const name = member.display_name ?? member.email ?? ''
  const child = member.child_name

  const nameClass = size === 'sm' ? 'text-sm text-gray-700' : 'text-gray-900 font-medium'
  const childClass = size === 'sm' ? 'text-xs text-gray-400' : 'text-sm text-gray-400'

  return (
    <span>
      <span className={nameClass}>{name}</span>
      {child && (
        <span className={childClass}> · de {child}</span>
      )}
    </span>
  )
}
