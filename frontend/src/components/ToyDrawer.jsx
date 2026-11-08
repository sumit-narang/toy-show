import { useEffect, useState } from 'react'
import ToyImage from './ToyImage.jsx'
import ToyCard from './ToyCard.jsx'
import { formatPrice, host, ytEmbed, ytThumb, ytWatch } from '../lib.js'

// "Keepie-uppies with Aoife and Tara | The Late Late Toy Show 2025" -> "Keepie-uppies with Aoife and Tara"
const cleanTitle = t => t.replace(/\s*[|·–—-]\s*(the\s+)?late late (toy )?show.*$/i, '').trim() || t

// Same card surface as the toy cards: video on top, caption inside
function Video({ video, label }) {
  const [playing, setPlaying] = useState(false)
  return (
    // Clicking anywhere on the card plays the clip in place; the play button keeps it keyboard-accessible
    <figure
      onClick={() => setPlaying(true)}
      className={`card-surface flex flex-col ${playing ? '' : 'card-hover group cursor-pointer'}`}
    >
      <div className="relative aspect-video bg-black">
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
      <figcaption className="flex items-start justify-between gap-4 px-4 py-3">
        <div className="flex flex-col min-w-0">
          <span className="text-xs text-black/55">{label}</span>
          <span className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-berry transition-colors">{cleanTitle(video.title)}</span>
        </div>
        <a href={ytWatch(video.id)} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="shrink-0 text-xs text-black/55 hover:text-berry">
          YouTube <span aria-hidden className="inline-block transition-transform group-hover:translate-x-[2px]">↗</span>
        </a>
      </figcaption>
    </figure>
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

        <ToyImage toy={toy} className="aspect-[4/3] w-full" />

        {/* Type scale: title 24 > price 18 > section headings 15 > body 14 > labels 12 */}
        <div className="px-5 sm:px-7 pt-6 pb-10 flex flex-col gap-8">

          <header className="flex flex-col">
            <p className="text-xs text-black/55">
              {[`Toy Show ${toy.year}`, toy.category, toy.irish && 'Irish', toy.ageRange && `Ages ${toy.ageRange}`, toy.brand].filter(Boolean).join(' · ')}
            </p>
            <h2 className="mt-1 text-2xl font-semibold leading-tight tracking-tight">{toy.name}</h2>
            {price && (
              <p className="mt-1 text-lg font-semibold text-ink">{price}</p>
            )}
          </header>

          {(toy.description || toy.highlights.length > 0) && (
            <section className="flex flex-col gap-3">
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
            <section className="flex flex-col gap-2">
              <h3 className="text-[15px] font-semibold">Clips</h3>
              <div className="flex flex-col gap-3">
                {toy.showClips.map(c => <Video key={c.id} video={c} label="From the Toy Show" />)}
                {toy.productVideo && <Video video={toy.productVideo} label="See it in action" />}
              </div>
            </section>
          )}

          {toy.retailers.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="text-[15px] font-semibold">Where it was sold in {toy.year}</h3>
              <ul className="flex flex-col gap-2">
                {toy.retailers.map(r => (
                  <li key={r.name + r.url}>
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noreferrer nofollow" className="card-surface group flex items-center justify-between px-4 py-3">
                        <span className="font-medium text-sm group-hover:text-berry transition-colors">{r.name}</span>
                        <span className="text-xs text-black/45">
                          {host(r.url)} <span aria-hidden className="inline-block transition-transform group-hover:translate-x-[2px]">↗</span>
                        </span>
                      </a>
                    ) : (
                      <span className="card-surface block px-4 py-3 text-sm font-medium">{r.name}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {related.length > 0 && (
            <section className="flex flex-col gap-3">
              <h3 className="text-[15px] font-semibold">Also on the {toy.year} show</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {related.map((r, i) => <ToyCard key={r.id} toy={r} index={i} />)}
              </div>
            </section>
          )}

          <footer className="text-xs text-black/45 border-t border-black/10 pt-4">
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
