'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ReactNode } from 'react'

export type PropertyCardData = {
  id: string
  title: string
  description: string | null
  price: number
  location: string
  image_url: string | null
}

type PropertyCardProps = {
  property: PropertyCardData
  isFavorite?: boolean
  favoriteBusy?: boolean
  actions?: ReactNode
  detailsLabel?: string
  onToggleFavorite?: (propertyId: string) => void
}

const currencyFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
})

export default function PropertyCard({
  property,
  isFavorite = false,
  favoriteBusy = false,
  actions,
  detailsLabel = 'View details',
  onToggleFavorite,
}: PropertyCardProps) {
  return (
    <article className="group relative overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      {onToggleFavorite && (
        <button
          type="button"
          onClick={() => onToggleFavorite(property.id)}
          disabled={favoriteBusy}
          aria-label={isFavorite ? 'Remove from favorites' : 'Save property'}
          aria-pressed={isFavorite}
          className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-white/95 text-xl leading-none text-neutral-950 shadow-sm transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isFavorite ? '♥' : '♡'}
        </button>
      )}

      <Link href={`/properties/${property.id}`} className="block">
        {property.image_url ? (
          <div className="relative h-56 w-full overflow-hidden">
            <Image
              src={property.image_url}
              alt={property.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
              className="object-cover transition duration-300 group-hover:scale-105"
            />
          </div>
        ) : (
          <div className="flex h-56 w-full items-center justify-center bg-neutral-200 text-sm font-medium text-neutral-500">
            No image
          </div>
        )}

        <div className="flex min-h-56 flex-col p-5">
          <div className="flex items-start justify-between gap-4">
            <h2 className="line-clamp-2 text-xl font-semibold leading-tight">
              {property.title}
            </h2>
            <p className="shrink-0 text-base font-bold text-neutral-950">
              {currencyFormatter.format(property.price)}
            </p>
          </div>

          <p className="mt-2 text-sm font-medium text-neutral-500">
            {property.location}
          </p>

          {property.description && (
            <p className="mt-4 line-clamp-3 text-sm leading-6 text-neutral-600">
              {property.description}
            </p>
          )}

          <p className="mt-auto pt-5 text-sm font-semibold text-neutral-950">
            {detailsLabel}
          </p>
        </div>
      </Link>

      {actions && (
        <div className="flex flex-col gap-2 border-t border-neutral-200 p-4 sm:flex-row">
          {actions}
        </div>
      )}
    </article>
  )
}
