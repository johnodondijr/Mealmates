import type { Member } from '../../types'
import { cn } from '../../lib/cn'

interface AvatarProps {
  member: Member
  size?: number
  ring?: boolean
  crown?: boolean
}

// A clean, soft-tinted circle with the member's emoji — no hard border.
export function Avatar({ member, size = 40, ring, crown }: AvatarProps) {
  return (
    <div className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <div
        className={cn(
          'flex items-center justify-center rounded-full',
          ring && 'ring-2 ring-white dark:ring-charcoal-900',
        )}
        style={{
          width: size,
          height: size,
          backgroundColor: member.color + '24',
          boxShadow: `inset 0 0 0 1.5px ${member.color}59`,
          fontSize: size * 0.5,
        }}
      >
        <span>{member.emoji}</span>
      </div>
      {crown && (
        <span
          className="absolute -right-1 -top-2"
          style={{ fontSize: size * 0.42 }}
        >
          👑
        </span>
      )}
    </div>
  )
}
