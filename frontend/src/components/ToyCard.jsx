import { Link } from 'react-router-dom'
import ToyImage from './ToyImage.jsx'
import { formatPrice } from '../lib.js'

// One white card holding the photo on top and the text underneath
export default function ToyCard({ toy, index }) {
  const price = formatPrice(toy)
  return (
    <Link
      to={`/toy/${toy.id}`}
      title={toy.name}
      className="animate-card card-surface group flex flex-col focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-berry"
      style={{ animationDelay: `${Math.min(index, 20) * 20}ms` }}
    >
      <ToyImage
        toy={toy}
        framed
        className="aspect-square w-full overflow-hidden shrink-0"
        frameClassName="p-[10%] pb-[6%]"
        imgClassName="rounded-[6px] transition group-hover:scale-105"
      />
      {/* percentage padding follows the card width, so the text lines up with the photo frame */}
      <div className="flex flex-col px-[10%] pb-[9%]">
        <p className="text-xs text-black/55 truncate">{toy.category}</p>
        <h3 className="text-sm font-semibold leading-snug truncate group-hover:text-berry transition-colors">{toy.name}</h3>
        {price && <p className="mt-0.5 text-xs font-semibold text-ink">{price}</p>}
      </div>
    </Link>
  )
}
