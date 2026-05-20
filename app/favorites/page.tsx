'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import PropertyCard, { PropertyCardData } from '@/components/PropertyCard'
import { supabase } from '@/src/lib/supabaseClient'

type FavoriteRow = {
  id: string
  property_id: string
  created_at: string
  property: PropertyCardData | null
}

type FavoriteQueryRow = Omit<FavoriteRow, 'property'> & {
  property: PropertyCardData | PropertyCardData[] | null
}

export default function FavoritesPage() {
  const router = useRouter()
  const [favorites, setFavorites] = useState<FavoriteRow[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const fetchFavorites = async () => {
      setLoading(true)
      setErrorMessage('')

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        router.push('/auth')
        return
      }

      setUserId(user.id)

      const { data, error } = await supabase
        .from('favorites')
        .select(
          `
            id,
            property_id,
            created_at,
            property:properties (
              id,
              title,
              description,
              price,
              location,
              image_url
            )
          `
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(60)

      if (error) {
        console.log(error)
        setErrorMessage('Unable to load saved properties right now.')
        setLoading(false)
        return
      }

      const nextFavorites = ((data as FavoriteQueryRow[]) || [])
        .map((favorite) => ({
          ...favorite,
          property: Array.isArray(favorite.property)
            ? favorite.property[0] ?? null
            : favorite.property,
        }))
        .filter((favorite): favorite is FavoriteRow => Boolean(favorite.property))

      setFavorites(nextFavorites)
      setLoading(false)
    }

    fetchFavorites()
  }, [router])

  const removeFavorite = async (propertyId: string) => {
    if (!userId) {
      router.push('/auth')
      return
    }

    const previousFavorites = favorites

    setBusyIds((current) => new Set(current).add(propertyId))
    setFavorites((current) =>
      current.filter((favorite) => favorite.property_id !== propertyId)
    )

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('property_id', propertyId)

    if (error) {
      console.log(error)
      setFavorites(previousFavorites)
      alert(error.message)
    }

    setBusyIds((current) => {
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
              Saved homes
            </p>
            <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Favorites</h1>
          </div>

          {!loading && (
            <p className="text-sm font-medium text-neutral-600">
              {favorites.length} {favorites.length === 1 ? 'property' : 'properties'} saved
            </p>
          )}
        </div>

        {errorMessage && (
          <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errorMessage}
          </p>
        )}

        {loading ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-96 animate-pulse rounded-lg border border-neutral-200 bg-white"
              />
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed border-neutral-300 bg-white px-6 py-12 text-center">
            <h2 className="text-xl font-semibold">No saved properties yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500">
              Save homes while browsing and they will stay here for quick access.
            </p>
            <Link
              href="/properties"
              className="mt-6 inline-flex h-11 items-center rounded-md bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Browse properties
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {favorites.map((favorite) => (
              <PropertyCard
                key={favorite.id}
                property={favorite.property as PropertyCardData}
                isFavorite
                favoriteBusy={busyIds.has(favorite.property_id)}
                onToggleFavorite={removeFavorite}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
