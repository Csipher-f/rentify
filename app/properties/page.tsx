'use client'

import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import PropertyCard from '@/components/PropertyCard'
import { supabase } from '@/src/lib/supabaseClient'

type SortOption = 'newest' | 'price_asc'

type Property = {
  id: string
  title: string
  description: string | null
  price: number
  location: string
  image_url: string | null
  created_at: string
}

type Filters = {
  search: string
  minPrice: string
  maxPrice: string
  sort: SortOption
}

const emptyFilters: Filters = {
  search: '',
  minPrice: '',
  maxPrice: '',
  sort: 'newest',
}

function normalizeSearch(value: string) {
  return value
    .trim()
    .replace(/[,%]/g, ' ')
    .replace(/\s+/g, '%')
}

function parsePrice(value: string) {
  const price = Number(value)
  return Number.isFinite(price) && price >= 0 ? price : null
}

export default function PropertiesPage() {
  const router = useRouter()
  const [properties, setProperties] = useState<Property[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [favoriteBusyIds, setFavoriteBusyIds] = useState<Set<string>>(new Set())
  const [draftFilters, setDraftFilters] = useState<Filters>(emptyFilters)
  const [appliedFilters, setAppliedFilters] = useState<Filters>(emptyFilters)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const resultLabel = useMemo(() => {
    if (loading) {
      return 'Searching properties...'
    }

    return `${properties.length} ${properties.length === 1 ? 'property' : 'properties'} found`
  }, [loading, properties.length])

  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true)
      setErrorMessage('')

      const minPrice = appliedFilters.minPrice
        ? parsePrice(appliedFilters.minPrice)
        : null
      const maxPrice = appliedFilters.maxPrice
        ? parsePrice(appliedFilters.maxPrice)
        : null

      if (
        (appliedFilters.minPrice && minPrice === null) ||
        (appliedFilters.maxPrice && maxPrice === null)
      ) {
        setProperties([])
        setErrorMessage('Enter a valid positive price range.')
        setLoading(false)
        return
      }

      if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
        setProperties([])
        setErrorMessage('Minimum price cannot be higher than maximum price.')
        setLoading(false)
        return
      }

      let query = supabase
        .from('properties')
        .select('id,title,description,price,location,image_url,created_at')

      const searchTerm = normalizeSearch(appliedFilters.search)

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%`)
      }

      if (minPrice !== null) {
        query = query.gte('price', minPrice)
      }

      if (maxPrice !== null) {
        query = query.lte('price', maxPrice)
      }

      query =
        appliedFilters.sort === 'price_asc'
          ? query.order('price', { ascending: true })
          : query.order('created_at', { ascending: false })

      const [{ data, error }, userResponse] = await Promise.all([
        query.limit(60),
        supabase.auth.getUser(),
      ])

      if (error) {
        console.log(error)
        setProperties([])
        setErrorMessage('Unable to load properties right now.')
        setLoading(false)
        return
      }

      const nextProperties = (data as Property[]) || []
      const currentUserId = userResponse.data.user?.id ?? null

      setProperties(nextProperties)
      setUserId(currentUserId)

      if (currentUserId && nextProperties.length > 0) {
        const { data: favorites, error: favoritesError } = await supabase
          .from('favorites')
          .select('property_id')
          .eq('user_id', currentUserId)
          .in(
            'property_id',
            nextProperties.map((property) => property.id)
          )

        if (favoritesError) {
          console.log(favoritesError)
          setFavoriteIds(new Set())
        } else {
          setFavoriteIds(
            new Set((favorites || []).map((favorite) => favorite.property_id))
          )
        }
      } else {
        setFavoriteIds(new Set())
      }

      setLoading(false)
    }

    fetchProperties()
  }, [appliedFilters])

  const updateDraftFilter = (key: keyof Filters, value: string) => {
    setDraftFilters((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAppliedFilters(draftFilters)
  }

  const clearFilters = () => {
    setDraftFilters(emptyFilters)
    setAppliedFilters(emptyFilters)
  }

  const toggleFavorite = async (propertyId: string) => {
    const currentUserId =
      userId ?? (await supabase.auth.getUser()).data.user?.id ?? null

    if (!currentUserId) {
      router.push('/auth')
      return
    }

    const wasFavorite = favoriteIds.has(propertyId)

    setFavoriteBusyIds((current) => new Set(current).add(propertyId))
    setFavoriteIds((current) => {
      const next = new Set(current)

      if (wasFavorite) {
        next.delete(propertyId)
      } else {
        next.add(propertyId)
      }

      return next
    })

    const { error } = wasFavorite
      ? await supabase
          .from('favorites')
          .delete()
          .eq('user_id', currentUserId)
          .eq('property_id', propertyId)
      : await supabase.from('favorites').insert({
          user_id: currentUserId,
          property_id: propertyId,
        })

    if (error) {
      console.log(error)
      setFavoriteIds((current) => {
        const next = new Set(current)

        if (wasFavorite) {
          next.add(propertyId)
        } else {
          next.delete(propertyId)
        }

        return next
      })
      alert(error.message)
    }

    setFavoriteBusyIds((current) => {
      const next = new Set(current)
      next.delete(propertyId)
      return next
    })
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-8 text-neutral-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
              Browse homes
            </p>
            <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Properties</h1>
          </div>

          <p className="text-sm font-medium text-neutral-600">{resultLabel}</p>
        </div>

        <form
          onSubmit={applyFilters}
          className="mt-6 grid gap-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(220px,1fr)_150px_150px_170px_auto]"
        >
          <label className="flex flex-col gap-2 text-sm font-medium text-neutral-700">
            Search
            <input
              type="search"
              value={draftFilters.search}
              onChange={(event) => updateDraftFilter('search', event.target.value)}
              placeholder="Title or location"
              className="h-11 rounded-md border border-neutral-300 px-3 text-base text-neutral-950 outline-none transition focus:border-neutral-950"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-neutral-700">
            Min price
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={draftFilters.minPrice}
              onChange={(event) => updateDraftFilter('minPrice', event.target.value)}
              placeholder="0"
              className="h-11 rounded-md border border-neutral-300 px-3 text-base text-neutral-950 outline-none transition focus:border-neutral-950"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-neutral-700">
            Max price
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={draftFilters.maxPrice}
              onChange={(event) => updateDraftFilter('maxPrice', event.target.value)}
              placeholder="Any"
              className="h-11 rounded-md border border-neutral-300 px-3 text-base text-neutral-950 outline-none transition focus:border-neutral-950"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-neutral-700">
            Sort
            <select
              value={draftFilters.sort}
              onChange={(event) =>
                updateDraftFilter('sort', event.target.value as SortOption)
              }
              className="h-11 rounded-md border border-neutral-300 px-3 text-base text-neutral-950 outline-none transition focus:border-neutral-950"
            >
              <option value="newest">Newest first</option>
              <option value="price_asc">Lowest price first</option>
            </select>
          </label>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="h-11 flex-1 rounded-md bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 md:flex-none"
            >
              Search
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="h-11 flex-1 rounded-md border border-neutral-300 px-5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 md:flex-none"
            >
              Clear
            </button>
          </div>
        </form>

        {errorMessage && (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errorMessage}
          </p>
        )}

        {loading ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-96 animate-pulse rounded-lg border border-neutral-200 bg-white"
              />
            ))}
          </div>
        ) : properties.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed border-neutral-300 bg-white px-6 py-12 text-center">
            <h2 className="text-xl font-semibold">No matching properties</h2>
            <p className="mt-2 text-sm text-neutral-500">
              Try widening your price range or searching another location.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                isFavorite={favoriteIds.has(property.id)}
                favoriteBusy={favoriteBusyIds.has(property.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
