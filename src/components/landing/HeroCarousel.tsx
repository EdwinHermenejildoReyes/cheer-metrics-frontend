'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface HeroImage {
  id: number;
  image: string;
  order: number;
}

const STATIC_IMAGES = ['/hero/cheer1.jpg', '/hero/cheer2.jpg'];
const INTERVAL_MS = 5000;

export function HeroCarousel() {
  const [images, setImages]   = useState<string[]>(STATIC_IMAGES);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_MAIN_API_URL ?? '/api/v1/';
    fetch(`${API_BASE}hero-images/?page_size=20`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.results?.length) {
          setImages(data.results.map((img: HeroImage) => img.image));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (images.length <= 1) return;
    const id = setInterval(() => {
      setCurrent(c => (c + 1) % images.length);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [images.length]);

  return (
    <>
      {/* Gradient overlay — darker on the left (text side), lighter on the right */}
      <div
        className="absolute inset-0 z-10"
        style={{
          background:
            'linear-gradient(105deg, rgba(9,9,11,0.82) 0%, rgba(9,9,11,0.65) 55%, rgba(9,9,11,0.35) 100%)',
        }}
      />
      {/* Extra bottom fade so dots stay readable */}
      <div className="absolute inset-x-0 bottom-0 h-32 z-10 bg-gradient-to-t from-zinc-950/70 to-transparent" />

      {images.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: i === current ? 1 : 0 }}
        >
          <Image
            src={src}
            alt=""
            fill
            priority={i === 0}
            className="object-cover object-center"
            sizes="100vw"
          />
        </div>
      ))}

      {/* Dot indicators */}
      {images.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === current ? 'w-6 bg-orange-400' : 'w-1.5 bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}
    </>
  );
}
