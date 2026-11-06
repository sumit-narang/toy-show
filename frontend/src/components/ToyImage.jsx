import { useState } from 'react'
import { categoryEmoji, ytThumb } from '../lib.js'

// Our saved photo first, then the product video's thumbnail, then a category placeholder
export default function ToyImage({ toy, className = '' }) {
  const image = toy.image && `${import.meta.env.BASE_URL}${toy.image}`
  const sources = [image, toy.productVideo && ytThumb(toy.productVideo.id)].filter(Boolean)
  const [idx, setIdx] = useState(0)

  if (idx >= sources.length) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-amber-50 to-rose-100 ${className}`}>
        <span className="text-5xl" aria-hidden>{categoryEmoji(toy.category)}</span>
      </div>
    )
  }
  const isThumb = sources[idx] !== image
  return (
    <div className={`bg-white ${className}`}>
      <img
        src={sources[idx]}
        alt={toy.name}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setIdx(i => i + 1)}
        className={`w-full h-full ${isThumb ? 'object-cover' : 'object-contain p-3'}`}
      />
    </div>
  )
}
