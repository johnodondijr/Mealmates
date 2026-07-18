import type { Wrapped } from '../engine/stats'
import { formatKES } from './format'

// Draw the Household Wrapped recap onto a canvas and share/download it as a
// PNG — perfect for dropping into WhatsApp. No external dependency needed.
export async function shareWrapped(w: Wrapped, householdName: string): Promise<void> {
  const scale = 2
  const width = 540
  const height = 860
  const canvas = document.createElement('canvas')
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.scale(scale, scale)

  // Background gradient (warm, appetizing).
  const grad = ctx.createLinearGradient(0, 0, width, height)
  grad.addColorStop(0, '#6EA630')
  grad.addColorStop(0.6, '#578A24')
  grad.addColorStop(1, '#42691C')
  ctx.fillStyle = grad
  roundRect(ctx, 0, 0, width, height, 0)
  ctx.fill()

  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.font = '700 22px "Plus Jakarta Sans", sans-serif'
  ctx.fillText('🍲 MealMates', width / 2, 64)

  ctx.fillStyle = '#ffffff'
  ctx.font = '800 44px "Plus Jakarta Sans", sans-serif'
  ctx.fillText('Household Wrapped', width / 2, 118)

  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.font = '700 20px "Plus Jakarta Sans", sans-serif'
  ctx.fillText(`${householdName} · ${w.monthLabel}`, width / 2, 150)

  const cards: Array<[string, string, string]> = [
    ['🏆', 'Top meal', w.topMeal ? `${w.topMeal.label} ×${w.topMeal.count}` : '—'],
    ['💸', 'Total spent', formatKES(w.totalSpent)],
    [
      '👑',
      'Chef’s favorite',
      w.chefFavorite ? `${w.chefFavorite.name} (${w.chefFavorite.wins} wins)` : '—',
    ],
    [
      '🤑',
      'Biggest spender',
      w.biggestSpender ? `${w.biggestSpender.name} · ${formatKES(w.biggestSpender.amount)}` : '—',
    ],
    ['🚫', 'Most refused', w.mostRefused ? w.mostRefused.name : '—'],
    ['🍽️', 'Meals logged', String(w.mealsLogged)],
  ]

  let y = 196
  const cardH = 96
  for (const [emoji, label, value] of cards) {
    ctx.fillStyle = 'rgba(255,255,255,0.16)'
    roundRect(ctx, 30, y, width - 60, cardH, 24)
    ctx.fill()

    ctx.textAlign = 'left'
    ctx.font = '400 40px sans-serif'
    ctx.fillText(emoji, 52, y + cardH / 2 + 14)

    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.font = '700 16px "Plus Jakarta Sans", sans-serif'
    ctx.fillText(label.toUpperCase(), 112, y + 38)

    ctx.fillStyle = '#ffffff'
    ctx.font = '800 24px "Plus Jakarta Sans", sans-serif'
    ctx.fillText(truncate(ctx, value, width - 160), 112, y + 68)

    y += cardH + 14
  }

  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.font = '700 16px "Plus Jakarta Sans", sans-serif'
  ctx.fillText('Made with MealMates 🎰', width / 2, height - 28)

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'))
  if (!blob) return
  const file = new File([blob], 'mealmates-wrapped.png', { type: 'image/png' })

  // Prefer native share (WhatsApp) when available.
  const nav = navigator as Navigator & {
    canShare?: (data: { files: File[] }) => boolean
  }
  if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({
        files: [file],
        title: 'MealMates Wrapped',
        text: `Our ${w.monthLabel} food recap 🍲`,
      })
      return
    } catch {
      /* user cancelled — fall through to download */
    }
  }

  // Fallback: trigger a download.
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'mealmates-wrapped.png'
  a.click()
  URL.revokeObjectURL(url)
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1)
  return t + '…'
}
