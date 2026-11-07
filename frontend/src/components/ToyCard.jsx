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
      className="animate-card group flex flex-col gap-2 rounded-[20px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-berry"
      style={{ animationDelay: `${Math.min(index, 20) * 20}ms` }}
    >
      <div className="relative rounded-[20px] overflow-hidden bg-white shadow-[0_2px_8px_#0000000f]">
        <ToyImage
          toy={toy}
          framed
          className="aspect-square w-full"
          frameClassName="p-[10%]"
          imgClassName="rounded-[6px] transition group-hover:scale-105"
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] border-[0.5px] border-[rgba(5,41,77,0.1)]" />
      </div>
      <div className="flex flex-col px-1">
        <p className="text-xs text-black/55 truncate">{toy.category}</p>
        <h3 className="text-sm font-semibold leading-snug truncate group-hover:text-berry transition-colors">{toy.name}</h3>
        {price && <p className="text-xs font-semibold text-ink">{price}</p>}
      </div>
    </Link>
  )
}
