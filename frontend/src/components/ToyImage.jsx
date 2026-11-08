import { useState } from 'react'
import { categoryEmoji, ytThumb } from '../lib.js'

// Our saved photo first, then the product video's thumbnail, then a category placeholder.
// framed: the photo sits inside the tile's padding (frameClassName) and its own box hugs the
// picture, so imgClassName styles like rounded corners land on the visible photo.
export default function ToyImage({ toy, className = '', imgClassName = '', padded = true, framed = false, frameClassName = '' }) {
  const image = toy.image && `${import.meta.env.BASE_URL}${toy.image}`
  const sources = [image, toy.productVideo && ytThumb(toy.productVideo.id)].filter(Boolean)
  const [idx, setIdx] = useState(0)
  const [wide, setWide] = useState(null)

  if (idx >= sources.length) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-amber-50 to-rose-100 ${className}`}>
        <span className="text-5xl" aria-hidden>{categoryEmoji(toy.category)}</span>
      </div>
    )
  }
  const isThumb = sources[idx] !== image
  const common = {
    src: sources[idx],
    alt: toy.name,
    loading: 'lazy',
    referrerPolicy: 'no-referrer',
    onError: () => setIdx(i => i + 1),
  }

  if (framed) {
    // Fill the frame along the photo's longer side; the other side follows its aspect ratio
    const size = wide === null ? 'max-w-full max-h-full' : wide ? 'w-full h-auto' : 'h-full w-auto'
    return (
      <div className={`bg-white ${className}`}>
        <div className={`w-full h-full flex items-center justify-center ${frameClassName}`}>
          <img
            {...common}
            onLoad={e => {
              // Compare the photo's shape with the frame's inner box (its padding may not be even)
              const img = e.currentTarget, frame = img.parentElement, s = getComputedStyle(frame)
              const fw = frame.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight)
              const fh = frame.clientHeight - parseFloat(s.paddingTop) - parseFloat(s.paddingBottom)
              setWide(img.naturalWidth / img.naturalHeight >= fw / fh)
            }}
            className={`block ${size} ${imgClassName}`}
          />
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white ${className}`}>
      <img
        {...common}
        className={`w-full h-full ${isThumb ? 'object-cover' : `object-contain${padded ? ' p-3' : ''}`} ${imgClassName}`}
      />
    </div>
  )
}
