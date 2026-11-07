import { Link } from 'react-router-dom'
import ToyImage from './ToyImage.jsx'
import { formatPrice } from '../lib.js'

// Image tile with the text underneath on the page background, no card box
export default function ToyCard({ toy, index }) {
  const price = formatPrice(toy)
  return (
    <Link
      to={`/toy/${toy.id}`}
      title={toy.name}
      className="animate-card group flex flex-col gap-2 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-berry"
      style={{ animationDelay: `${Math.min(index, 20) * 20}ms` }}
    >
      <div className="relative rounded-2xl overflow-hidden ring-1 ring-black/5">
        <ToyImage toy={toy} className="aspect-square w-full transition-transform duration-300 group-hover:scale-[1.03]" />
        <span className="absolute top-2 left-2 rounded-full bg-ink/85 text-white text-[11px] font-semibold px-2 py-0.5">
          {toy.year}
        </span>
        {(toy.productVideo || toy.showClips.length > 0) && (
          <span title="Has video" className="absolute top-2 right-2 rounded-full bg-berry text-white text-[11px] font-semibold px-1.5 py-0.5">▶</span>
        )}
      </div>
      <div className="flex flex-col px-1">
        <p className="text-xs text-black/55 truncate">{toy.category}</p>
        <h3 className="text-sm font-semibold leading-snug truncate group-hover:text-berry transition-colors">{toy.name}</h3>
        {price && <p className="text-xs font-semibold text-ink">{price}</p>}
      </div>
    </Link>
  )
}
