// Confirmed Toy Show dates (Irish time). Add each year's date once RTÉ announces it.
// Years not listed fall back to the last Friday of November, the usual slot.
const SHOW_DATES = {
  2026: '2026-12-04',
}
const SHOW_TIME = 'T21:35:00Z' // 9:35pm in Ireland (GMT in winter, so the same as UTC)

function lastFridayOfNovember(year) {
  const d = new Date(Date.UTC(year, 10, 30))
  d.setUTCDate(30 - ((d.getUTCDay() + 2) % 7)) // step back from 30 Nov to the Friday
  return d.toISOString().slice(0, 10)
}

function showDate(year) {
  return new Date((SHOW_DATES[year] || lastFridayOfNovember(year)) + SHOW_TIME)
}

// The next show: this year's, or next year's once this year's has finished (the show runs about 3 hours)
export function nextShow(now = new Date()) {
  const thisYear = showDate(now.getUTCFullYear())
  return now - thisYear > 3 * 3_600_000 ? showDate(now.getUTCFullYear() + 1) : thisYear
}

export const NEXT_SHOW = nextShow()

export function formatPrice(toy) {
  if (toy.priceEur != null) {
    return `€${toy.priceEur % 1 === 0 ? toy.priceEur.toFixed(0) : toy.priceEur.toFixed(2)}`
  }
  return toy.priceText || null
}

// Whole calendar days between today and the date, both taken in Irish time (0 on the day itself)
export function daysUntil(date, now = new Date()) {
  const day = d => Date.parse(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Dublin' }).format(d))
  return Math.round((day(date) - day(now)) / 86_400_000)
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
