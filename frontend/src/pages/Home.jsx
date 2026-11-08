import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import data from '../data/toys.json'
import ToyCard from '../components/ToyCard.jsx'
import ToyDrawer from '../components/ToyDrawer.jsx'
import { NEXT_SHOW, daysUntil, ytThumb, ytWatch } from '../lib.js'

const { toys, years } = data
const YEARS = Object.keys(years).map(Number).sort((a, b) => b - a)
const PAGE = 60

const SORTS = {
  year: (a, b) => b.year - a.year || a.name.localeCompare(b.name),
  name: (a, b) => a.name.localeCompare(b.name),
  priceHigh: (a, b) => (b.priceEur ?? -1) - (a.priceEur ?? -1),
  priceLow: (a, b) => (a.priceEur ?? Infinity) - (b.priceEur ?? Infinity),
}

// Fixed (not random per render) so the flakes don't jump around when the page re-renders.
// Negative delays start each flake part-way through its fall, so the pill is snowy from the first frame.
const SNOW = [
  { x: 4, size: 2, opacity: 0.7, dur: 3.2, delay: -0.4, drift: 4 },
  { x: 11, size: 3, opacity: 0.9, dur: 4.1, delay: -2.1, drift: -3 },
  { x: 19, size: 2, opacity: 0.6, dur: 3.6, delay: -1.2, drift: 5 },
  { x: 27, size: 2, opacity: 0.8, dur: 4.6, delay: -3.3, drift: -4 },
  { x: 35, size: 3, opacity: 0.7, dur: 3.9, delay: -0.9, drift: 3 },
  { x: 43, size: 2, opacity: 0.9, dur: 3.3, delay: -2.6, drift: -5 },
  { x: 51, size: 2, opacity: 0.6, dur: 4.4, delay: -1.7, drift: 4 },
  { x: 59, size: 3, opacity: 0.8, dur: 3.7, delay: -3.8, drift: -3 },
  { x: 67, size: 2, opacity: 0.7, dur: 4.2, delay: -0.2, drift: 5 },
  { x: 75, size: 2, opacity: 0.9, dur: 3.4, delay: -2.9, drift: -4 },
  { x: 83, size: 3, opacity: 0.6, dur: 4.8, delay: -1.5, drift: 3 },
  { x: 91, size: 2, opacity: 0.8, dur: 3.8, delay: -3.1, drift: -5 },
  { x: 97, size: 2, opacity: 0.7, dur: 4.3, delay: -0.7, drift: 4 },
]

function Snow() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      {SNOW.map((f, i) => (
        <span
          key={i}
          className="snowflake"
          style={{ left: `${f.x}%`, width: f.size, height: f.size, opacity: f.opacity, animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s`, '--drift': `${f.drift}px` }}
        />
      ))}
    </span>
  )
}

function Hero() {
  const days = daysUntil(NEXT_SHOW)
  const showCountdown = days >= 0 && days < 60
  const year = NEXT_SHOW.getUTCFullYear()
  const countdown = days === 0 ? `The ${year} Toy Show is on tonight` : `${days} ${days === 1 ? 'day' : 'days'} until the ${year} Toy Show`
  return (
    <header className="relative bg-ink">
      <h1 className="sr-only">Every toy from the Late Late Toy Show</h1>
      <img
        src={`${import.meta.env.BASE_URL}banner.webp`}
        alt=""
        fetchPriority="high"
        className="block w-full aspect-[1800/1241] sm:aspect-[16/7] max-h-[70vh] object-cover object-[50%_20%]"
      />
      {showCountdown && (
        <>
          {/* a soft dark gradient over the bottom of the photo so the pill doesn't get lost in it */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />
          <p className="absolute bottom-3 left-1/2 -translate-x-1/2 sm:bottom-5 whitespace-nowrap inline-flex items-center gap-2 overflow-hidden rounded-full bg-black/55 backdrop-blur-sm ring-1 ring-white/25 text-white px-4 py-2 text-xs sm:text-sm font-semibold">
            <Snow />
            <span className="relative">🎄 {countdown}</span>
          </p>
        </>
      )}
    </header>
  )
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
        active ? 'bg-berry text-white' : 'bg-white ring-1 ring-black/10 hover:ring-berry/50 hover:text-berry'
      }`}
    >
      {children}
    </button>
  )
}

function YearClips({ year }) {
  const info = years[year]
  if (!info.clips.length) return null
  return (
    <section className="mb-8">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-display text-xl font-bold">Clips from the {year} show</h2>
        <span className="text-xs text-black/45">Official uploads from The Late Late Show on YouTube</span>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
        {info.clips.map(c => (
          <a key={c.id} href={ytWatch(c.id)} target="_blank" rel="noreferrer" className="group shrink-0 w-60">
            <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
              <img src={ytThumb(c.id)} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              <span className="absolute bottom-2 right-2 rounded-full bg-berry text-white text-xs px-2 py-0.5">▶</span>
            </div>
            <p className="mt-1.5 text-xs font-medium line-clamp-2 group-hover:text-berry">{c.title}</p>
          </a>
        ))}
      </div>
    </section>
  )
}

export default function Home() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const year = params.get('year') ? Number(params.get('year')) : null
  const sort = params.get('sort') || 'year'
  const q = params.get('q') || ''

  const setParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value == null || value === '' || value === false) next.delete(key)
    else next.set(key, value === true ? '1' : value)
    setParams(next, { replace: true })
  }

  // Paging resets whenever the filters change
  const filterKey = [year, sort, q].join('|')
  const [paging, setPaging] = useState({ key: filterKey, limit: PAGE })
  const limit = paging.key === filterKey ? paging.limit : PAGE
  const showMore = () => setPaging({ key: filterKey, limit: limit + PAGE })

  const filtered = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    return toys
      .filter(t => (!year || t.year === year)
        && words.every(w => t.search.includes(w)))
      .sort(SORTS[sort])
  }, [year, sort, q])

  const selected = id ? toys.find(t => t.id === id) : null
  const related = useMemo(
    () => selected ? toys.filter(t => t.year === selected.year && t.id !== selected.id && t.category === selected.category).slice(0, 6) : [],
    [selected],
  )
  const close = useCallback(() => navigate({ pathname: '/', search: params.toString() }), [navigate, params])

  return (
    <div className="min-h-screen">
      <Hero />

      <div className="sticky top-0 z-30 bg-paper/90 backdrop-blur border-b border-black/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              value={q}
              onChange={e => setParam('q', e.target.value)}
              placeholder="Search toys, brands, shops…"
              className="flex-1 min-w-0 rounded-full bg-white ring-1 ring-black/10 focus:ring-2 focus:ring-berry outline-none px-4 py-2 text-sm"
            />
            <div className="relative shrink-0">
              <select
                value={sort}
                onChange={e => setParam('sort', e.target.value === 'year' ? null : e.target.value)}
                className={`appearance-none cursor-pointer rounded-full bg-white ring-1 hover:ring-berry/50 focus:ring-2 focus:ring-berry outline-none pl-4 pr-9 py-2 text-sm font-medium ${
                  sort === 'year' ? 'ring-black/10' : 'ring-berry text-berry'
                }`}
                aria-label="Sort"
              >
                <option value="year">Newest</option>
                <option value="name">A–Z</option>
                <option value="priceHigh">Price high</option>
                <option value="priceLow">Price low</option>
              </select>
              <svg aria-hidden viewBox="0 0 16 16" className={`pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${sort === 'year' ? 'text-black/55' : 'text-berry'}`}>
                <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          {/* the extra 4px of padding (cancelled by negative margin) keeps the pills' outlines inside the scroll area */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:-mx-1 sm:px-1 -my-1 py-1">
            <Chip active={!year} onClick={() => setParam('year', null)}>All years</Chip>
            {YEARS.map(y => (
              <Chip key={y} active={year === y} onClick={() => setParam('year', year === y ? null : String(y))}>{y}</Chip>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {year && <YearClips year={year} />}

        <p className="text-sm text-black/55 mb-4">
          {filtered.length.toLocaleString()} {filtered.length === 1 ? 'toy' : 'toys'}
          {year && years[year].host && <> · presented by {years[year].host}</>}
        </p>

        {filtered.length === 0 ? (
          <div className="text-center py-20 text-black/55">
            <p className="text-4xl mb-2">🧸</p>
            <p>No toys match that. Try clearing a filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-3 gap-y-6 sm:gap-x-4">
            {filtered.slice(0, limit).map((t, i) => <ToyCard key={t.id} toy={t} index={i % PAGE} />)}
          </div>
        )}

        {limit < filtered.length && (
          <div className="flex justify-center mt-8">
            <button onClick={showMore} className="rounded-full bg-berry text-white px-6 py-2.5 text-sm font-semibold hover:bg-berry-dark transition-colors">
              Show more ({(filtered.length - limit).toLocaleString()} left)
            </button>
          </div>
        )}
      </main>

      <footer className="border-t border-black/10 mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 text-xs text-black/50 text-center">
          <p>Not affiliated with RTÉ or The Late Late Toy Show. Prices are as listed at the time of each show.</p>
        </div>
      </footer>

      {selected && <ToyDrawer key={selected.id} toy={selected} related={related} onClose={close} />}
    </div>
  )
}
