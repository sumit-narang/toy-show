import { useEffect, useState } from 'react'
import ToyImage from './ToyImage.jsx'
import ToyCard from './ToyCard.jsx'
import { formatPrice, host, ytEmbed, ytSearch, ytThumb, ytWatch } from '../lib.js'

function Video({ video, label }) {
  const [playing, setPlaying] = useState(false)
  return (
    <figure className="flex flex-col gap-1.5">
      <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
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
      <figcaption className="text-xs text-black/55 flex items-start justify-between gap-2">
        <span>
          <span className="font-semibold text-ink">{label}</span> · {video.title}
          {video.channel && <span> — {video.channel}</span>}
        </span>
        <a href={ytWatch(video.id)} target="_blank" rel="noreferrer" className="shrink-0 underline hover:text-berry">YouTube ↗</a>
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

        <div className="px-5 sm:px-7 pt-6 pb-10 flex flex-col gap-6">

          <header className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
              <span className="rounded-full bg-ink text-white px-2.5 py-1">Toy Show {toy.year}</span>
              <span className="rounded-full bg-white ring-1 ring-black/10 px-2.5 py-1">{toy.category}</span>
              {toy.irish && <span className="rounded-full bg-pine text-white px-2.5 py-1">☘ Irish</span>}
              {toy.ageRange && <span className="rounded-full bg-white ring-1 ring-black/10 px-2.5 py-1">Ages {toy.ageRange}</span>}
            </div>
            {toy.brand && <p className="text-xs uppercase tracking-wider font-semibold text-black/45 mt-1">{toy.brand}</p>}
            <h2 className="font-display text-3xl font-extrabold leading-tight">{toy.name}</h2>
            {price && (
              <p className="text-sm text-black/60">
                <span className="text-lg font-bold text-ink">{price}</span> at the time of the {toy.year} show
              </p>
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
            <section className="flex flex-col gap-4">
              <h3 className="font-display text-lg font-bold">Clips</h3>
              {toy.showClips.map(c => <Video key={c.id} video={c} label="From the Toy Show segment" />)}
              {toy.productVideo && <Video video={toy.productVideo} label="See it in action" />}
              <a
                href={ytSearch(`${toy.name} Late Late Toy Show ${toy.year}`)}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-berry hover:underline self-start"
              >
                Search YouTube for more clips ↗
              </a>
            </section>
          )}

          {toy.retailers.length > 0 && (
            <section className="flex flex-col gap-2">
              <div className="flex flex-col gap-0.5">
                <h3 className="font-display text-lg font-bold">Where it was sold in {toy.year}</h3>
                <p className="text-xs text-black/45">Links are from RTÉ's original list. Older ones may no longer work.</p>
              </div>
              <ul className="flex flex-col gap-2">
                {toy.retailers.map(r => (
                  <li key={r.name + r.url}>
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noreferrer nofollow" className="card-surface group flex items-center justify-between px-4 py-3">
                        <span className="font-medium text-sm group-hover:text-berry transition-colors">{r.name}</span>
                        <span className="text-xs text-black/45">{host(r.url)} ↗</span>
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
              <h3 className="font-display text-lg font-bold">Also on the {toy.year} show</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {related.map((r, i) => <ToyCard key={r.id} toy={r} index={i} />)}
              </div>
            </section>
          )}

          <footer className="text-xs text-black/45 border-t border-black/10 pt-4">
            Source:{' '}
            <a href={toy.source} target="_blank" rel="noreferrer" className="underline hover:text-berry">
              RTÉ — Every toy from The Late Late Toy Show {toy.year}
            </a>
            .{toy.imageMatched && <> The photo was found by searching for the toy's name, so it may show a different version.</>}
            {toy.description && <> The description was written with AI from retailer info{toy.confidence === 'low' ? ' and is a best guess' : ''}.</>}
          </footer>
        </div>
      </aside>
    </div>
  )
}
