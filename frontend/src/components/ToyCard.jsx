import { Link } from 'react-router-dom'
import ToyImage from './ToyImage.jsx'
import { formatPrice } from '../lib.js'

export default function ToyCard({ toy, index }) {
  const price = formatPrice(toy)
  return (
    <Link
      to={`/toy/${toy.id}`}
      className="animate-card group flex flex-col rounded-2xl bg-white ring-1 ring-black/5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all overflow-hidden"
      style={{ animationDelay: `${Math.min(index, 20) * 20}ms` }}
    >
      <div className="relative">
        <ToyImage toy={toy} className="aspect-square w-full" />
        <span className="absolute top-2 left-2 rounded-full bg-ink/85 text-white text-[11px] font-semibold px-2 py-0.5">
          {toy.year}
        </span>
        <div className="absolute top-2 right-2 flex gap-1">
          {(toy.productVideo || toy.showClips.length > 0) && (
            <span title="Has video" className="rounded-full bg-berry text-white text-[11px] font-semibold px-1.5 py-0.5">▶</span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1 p-3 flex-1">
        {toy.brand && <p className="text-[11px] uppercase tracking-wide text-black/45 font-semibold truncate">{toy.brand}</p>}
        <h3 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-berry transition-colors">{toy.name}</h3>
        <div className="mt-auto pt-1 flex items-center justify-between text-xs text-black/55">
          <span className="truncate">{toy.category}</span>
          {price && <span className="font-semibold text-ink shrink-0 ml-2">{price}</span>}
        </div>
      </div>
    </Link>
  )
}
