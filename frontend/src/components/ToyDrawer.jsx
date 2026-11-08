import { useEffect, useState } from 'react'
import ToyCard from './ToyCard.jsx'
import { categoryEmoji, formatPrice, host, ytEmbed, ytThumb } from '../lib.js'

// Just the video, no caption: the thumbnail plays the clip in place when clicked
function Video({ video }) {
  const [playing, setPlaying] = useState(false)
  return (
    <div className="relative aspect-video bg-black rounded-[12px] overflow-hidden">
        {playing ? (
          <iframe
            src={`${ytEmbed(video.id)}&autoplay=1`}
            title={video.title}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        ) : (
          <button onClick={() => setPlaying(true)} className="group absolute inset-0 w-full h-full" aria-label={`Play ${video.title}`}>
            <img src={ytThumb(video.id)} alt="" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="w-14 h-14 rounded-full bg-berry text-white flex items-center justify-center text-xl shadow-lg group-hover:scale-110 transition-transform">▶</span>
            </span>
          </button>
        )}
    </div>
  )
}

const Arrow = () => <span aria-hidden className="inline-block transition-transform group-hover:translate-x-[2px]">↗</span>

// "Where it was sold": rounded pills that wrap. Shops without a link show the name only, with no arrow.
function ShopList({ shops }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {shops.map(r => {
        const className = 'group inline-flex items-center gap-1.5 rounded-full bg-white ring-1 ring-black/10 px-3.5 py-1.5 text-sm font-medium'
        return (
          <li key={r.name + r.url}>
            {r.url ? (
              <a href={r.url} target="_blank" rel="noreferrer nofollow" className={`${className} hover:ring-berry/50 transition`}>
                <span className="group-hover:text-berry transition-colors">{r.name}</span>
                <span className="text-black/45 group-hover:text-berry transition-colors"><Arrow /></span>
              </a>
            ) : (
              <span className={className}>{r.name}</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

// Photo header: a blurred, enlarged copy of the photo fills the background and the real photo sits sharp on top
function Hero({ toy }) {
  const sources = [toy.image && `${import.meta.env.BASE_URL}${toy.image}`, toy.productVideo && ytThumb(toy.productVideo.id)].filter(Boolean)
  const [idx, setIdx] = useState(0)
  const src = sources[idx]
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-ink">
      {src ? (
        <>
          <img src={src} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover scale-125 blur-2xl opacity-80" />
          <div className="absolute inset-0 flex items-center justify-center p-10">
            <img
              src={src}
              alt={toy.name}
              referrerPolicy="no-referrer"
              onError={() => setIdx(i => i + 1)}
              className="max-w-full max-h-full object-contain rounded-[6px] shadow-[0_8px_30px_rgba(0,0,0,0.25)]"
            />
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-amber-50 to-rose-100">
          <span className="text-7xl" aria-hidden>{categoryEmoji(toy.category)}</span>
        </div>
      )}
    </div>
  )
}

export default function ToyDrawer({ toy, related, onClose }) {
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const price = formatPrice(toy)
  // Based on shop.com's product page: 18px section headings, each section closed by a 1px hairline,
  // with 20px of space either side of every hairline
  const headingClass = 'pt-5 pb-4 text-base leading-5 font-semibold'
  const sectionClass = 'pb-5 border-b border-[rgba(24,59,78,0.06)] last:border-b-0'

  return (
    <div className="fixed inset-0 z-50">
      <div className="animate-backdrop absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <aside
        role="dialog"
        aria-label={toy.name}
        className="animate-drawer absolute right-0 top-0 h-full w-full sm:w-[560px] sm:right-3 sm:top-3 sm:h-[calc(100%-24px)] bg-paper sm:rounded-[16px] shadow-2xl overflow-y-auto"
      >
        {/* zero-height sticky row: the close button floats over the photo without pushing it down */}
        <div className="sticky top-0 z-10 h-0 flex justify-end">
          <button onClick={onClose} className="mt-3 mr-3 w-9 h-9 shrink-0 rounded-full bg-white/90 ring-1 ring-black/10 hover:bg-white text-lg" aria-label="Close">✕</button>
        </div>

        {/* Type scale: title 24 > section headings and price 16 > body 14 > labels 12; -0.3px letter spacing everywhere */}
        <Hero toy={toy} />

        <div className="px-5 sm:px-7 pt-6 pb-10 flex flex-col">

          <header className={`flex flex-col ${sectionClass}`}>
            <p className="text-xs text-black/55">
              {[`Toy Show ${toy.year}`, toy.category, toy.irish && 'Irish', toy.ageRange && `Ages ${toy.ageRange}`, toy.brand].filter(Boolean).join(' · ')}
            </p>
            <h2 className="mt-1 text-2xl leading-7 font-semibold">{toy.name}</h2>
            {price && <p className="mt-1 text-base font-semibold text-ink">{price}</p>}
          </header>

          {(toy.description || toy.highlights.length > 0) && (
            <section className={`flex flex-col gap-3 pt-5 ${sectionClass}`}>
              {toy.description && <p className="text-[15px] leading-relaxed text-black/80">{toy.description}</p>}
              {toy.highlights.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {toy.highlights.map(h => (
                    <li key={h} className="text-xs rounded-full bg-gold/25 text-ink px-3 py-1 font-medium">✦ {h}</li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {(toy.showClips.length > 0 || toy.productVideo) && (
            <section className={sectionClass}>
              <h3 className={headingClass}>Clips</h3>
              <div className="flex flex-col gap-3">
                {toy.showClips.map(c => <Video key={c.id} video={c} />)}
                {toy.productVideo && <Video video={toy.productVideo} />}
              </div>
            </section>
          )}

          {toy.retailers.length > 0 && (
            <section className={sectionClass}>
              <h3 className={headingClass}>Where it was sold in {toy.year}</h3>
              <ShopList shops={toy.retailers} />
            </section>
          )}

          {related.length > 0 && (
            <section className={sectionClass}>
              <h3 className={headingClass}>Also on the {toy.year} show</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {related.map((r, i) => <ToyCard key={r.id} toy={r} index={i} />)}
              </div>
            </section>
          )}

          <footer className="pt-5 text-xs text-black/45">
            Source:{' '}
            <a href={toy.source} target="_blank" rel="noreferrer" className="underline hover:text-berry">
              RTÉ — The Late Late Toy Show {toy.year}
            </a>
            {toy.description && <>. The description was written with AI from retailer info{toy.confidence === 'low' ? ' and is a best guess' : ''}.</>}
          </footer>
        </div>
      </aside>
    </div>
  )
}
