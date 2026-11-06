// The 2026 show is expected on the last Friday of November (RTÉ confirms the date closer to the time)
export const NEXT_SHOW = new Date('2026-11-27T21:35:00Z')

export function formatPrice(toy) {
  if (toy.priceEur != null) {
    return `€${toy.priceEur % 1 === 0 ? toy.priceEur.toFixed(0) : toy.priceEur.toFixed(2)}`
  }
  return toy.priceText || null
}

export function daysUntil(date) {
  return Math.ceil((date - new Date()) / 86_400_000)
}

export function ytThumb(id) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
}

export function ytEmbed(id) {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0`
}

export function ytWatch(id) {
  return `https://www.youtube.com/watch?v=${id}`
}

export function ytSearch(q) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`
}

export function host(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

const CATEGORY_EMOJI = {
  'Interactive pets & robots': '🐾',
  'LEGO & building': '🧱',
  'Dolls & fashion': '👗',
  'Plush & soft toys': '🧸',
  'Board games & cards': '🎲',
  'Puzzles': '🧩',
  'Books': '📚',
  'Arts & crafts': '🎨',
  'Science & STEM': '🔬',
  'Vehicles & remote control': '🏎️',
  'Action figures & playsets': '🦸',
  'Pretend play': '🍳',
  'Music & dance': '🥁',
  'Baby & toddler': '🍼',
  'Outdoor, sport & ride-ons': '🛴',
  'Gaming & tech': '🎮',
  'Other': '🎁',
}

export function categoryEmoji(category) {
  return CATEGORY_EMOJI[category] || '🎁'
}
