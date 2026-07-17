import type { Member } from '../../types'
import { cn } from '../../lib/cn'

interface AvatarProps {
  member: Member
  size?: number
  ring?: boolean
  crown?: boolean
}

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
          backgroundColor: member.color + '30',
          border: `2px solid ${member.color}`,
          fontSize: size * 0.5,
        }}
      >
        <span>{member.emoji}</span>
      </div>
      {crown && (
        <span
          className="absolute -right-1 -top-2 text-base"
          style={{ fontSize: size * 0.4 }}
        >
          👑
        </span>
      )}
    </div>
  )
}
