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

function Hero() {
  const days = daysUntil(NEXT_SHOW)
  return (
    <header className="relative bg-ink">
      <h1 className="sr-only">Every toy from the Late Late Toy Show</h1>
      <img
        src={`${import.meta.env.BASE_URL}banner.webp`}
        alt=""
        fetchPriority="high"
        className="block w-full aspect-[1800/1241] sm:aspect-[16/7] max-h-[70vh] object-cover object-[50%_45%]"
      />
      {days > 0 && days < 60 && (
        <p className="absolute bottom-3 left-1/2 -translate-x-1/2 sm:bottom-5 whitespace-nowrap inline-flex items-center gap-2 rounded-full bg-black/55 backdrop-blur-sm ring-1 ring-white/25 text-white px-4 py-2 text-xs sm:text-sm font-semibold">
          🎄 {days} {days === 1 ? 'day' : 'days'} until the {NEXT_SHOW.getFullYear()} Toy Show
        </p>
      )}
    </header>
  )
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
        active ? 'bg-ink text-white' : 'bg-white ring-1 ring-black/10 hover:ring-black/25'
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
                className="appearance-none cursor-pointer rounded-full bg-white ring-1 ring-black/10 hover:ring-black/25 focus:ring-2 focus:ring-berry outline-none pl-4 pr-9 py-2 text-sm font-medium"
                aria-label="Sort"
              >
                <option value="year">Newest</option>
                <option value="name">A–Z</option>
                <option value="priceHigh">Price high</option>
                <option value="priceLow">Price low</option>
              </select>
              <svg aria-hidden viewBox="0 0 16 16" className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/55">
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
            <button onClick={showMore} className="rounded-full bg-ink text-white px-6 py-2.5 text-sm font-semibold hover:bg-black">
              Show more ({(filtered.length - limit).toLocaleString()} left)
            </button>
          </div>
        )}
      </main>

      <footer className="border-t border-black/10 mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 text-xs text-black/50 flex flex-col gap-2">
          <p>
            An unofficial fan project, not affiliated with RTÉ. Toy lists come from RTÉ's yearly “Every toy from The Late Late Toy Show” articles.
            Descriptions were written with AI from retailer information, and product videos are matched automatically, so the odd one may be off.
          </p>
          <p>Prices are as listed at the time of each show.</p>
        </div>
      </footer>

      {selected && <ToyDrawer key={selected.id} toy={selected} related={related} onClose={close} />}
    </div>
  )
}
