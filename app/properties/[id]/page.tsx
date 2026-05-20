'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/src/lib/supabaseClient'

type PropertyDetailsData = {
  id: string
  owner_id: string
  title: string
  description: string | null
  price: number
  location: string
  image_url: string | null
}

export default function PropertyDetails() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [property, setProperty] = useState<PropertyDetailsData | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [currentRole, setCurrentRole] = useState<string | null>(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [favoriteBusy, setFavoriteBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const contactLandlord = async () => {
    if (!property) return

    const currentProperty = property

    // GET CURRENT USER
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/auth')
      return
    }

    // PREVENT LANDLORD MESSAGING THEMSELF
    if (user.id === currentProperty.owner_id) {
      alert("This is your property")
      return
    }

    // CHECK IF CONVERSATION ALREADY EXISTS
    const { data: existingConversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('property_id', currentProperty.id)
      .eq('tenant_id', user.id)
      .maybeSingle()

    // IF EXISTS → OPEN IT
    if (existingConversation) {
      router.push(`/messages/${existingConversation.id}`)
      return
    }

    // CREATE NEW CONVERSATION
    const { data, error } = await supabase
      .from('conversations')
      .insert([
        {
          property_id: currentProperty.id,
          landlord_id: currentProperty.owner_id,
          tenant_id: user.id,
        },
      ])
      .select()
      .single()

    if (error) {
      alert(error.message)
      return
    }

    router.push(`/messages/${data.id}`)
  }

  useEffect(() => {
    const fetchProperty = async () => {
      const [{ data, error }, userResponse] = await Promise.all([
        supabase
          .from('properties')
          .select('id,owner_id,title,description,price,location,image_url')
          .eq('id', id)
          .single(),
        supabase.auth.getUser(),
      ])

      if (error) {
        console.log(error)
        setLoading(false)
        return
      }

      const nextProperty = data as PropertyDetailsData
      const currentUserId = userResponse.data.user?.id ?? null

      setProperty(nextProperty)
      setUserId(currentUserId)

      if (currentUserId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', currentUserId)
          .maybeSingle()

        setCurrentRole((profile as { role?: string | null } | null)?.role ?? null)

        const { data: favorite, error: favoriteError } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', currentUserId)
          .eq('property_id', nextProperty.id)
          .maybeSingle()

        if (favoriteError) {
          console.log(favoriteError)
        }

        setIsFavorite(Boolean(favorite))
      }

      setLoading(false)
    }

    fetchProperty()
  }, [id])

  const toggleFavorite = async () => {
    if (!property) return

    const currentUserId =
      userId ?? (await supabase.auth.getUser()).data.user?.id ?? null

    if (!currentUserId) {
      router.push('/auth')
      return
    }

    const nextFavoriteState = !isFavorite

    setFavoriteBusy(true)
    setIsFavorite(nextFavoriteState)

    const { error } = isFavorite
      ? await supabase
          .from('favorites')
          .delete()
          .eq('user_id', currentUserId)
          .eq('property_id', property.id)
      : await supabase.from('favorites').insert({
          user_id: currentUserId,
          property_id: property.id,
        })

    if (error) {
      console.log(error)
      setIsFavorite(!nextFavoriteState)
      alert(error.message)
    }

    setFavoriteBusy(false)
  }

  if (loading) {
    return <p className="p-6">Loading property...</p>
  }

  if (!property) {
    return <p className="p-6">Property not found</p>
  }

  const ownsProperty = userId === property.owner_id
  const showTenantActions = !ownsProperty && currentRole !== 'landlord'

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {property.image_url && (
        <div className="relative h-[400px] w-full overflow-hidden rounded-xl">
          <Image
            src={property.image_url}
            alt={property.title}
            fill
            sizes="(max-width: 1024px) 100vw, 896px"
            className="object-cover"
            priority
          />
        </div>
      )}

      <h1 className="text-3xl font-bold mt-4">
        {property.title}
      </h1>

      <p className="text-gray-600 mt-2">
        {property.location}
      </p>

      <p className="mt-4 text-lg">
        {property.description}
      </p>

      <p className="mt-4 text-2xl font-semibold">
        ₦{property.price}
      </p>

      {ownsProperty ? (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => router.push(`/dashboard/properties/${property.id}/edit`)}
            className="rounded-lg bg-neutral-950 px-6 py-3 text-white"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => alert('Analytics will be available soon.')}
            className="rounded-lg border border-neutral-300 px-6 py-3 font-medium text-neutral-900 transition hover:bg-neutral-100"
          >
            View Analytics
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard/properties')}
            className="rounded-lg border border-neutral-300 px-6 py-3 font-medium text-neutral-900 transition hover:bg-neutral-100"
          >
            Manage Listing
          </button>
        </div>
      ) : showTenantActions ? (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={contactLandlord}
            className="rounded-lg bg-blue-600 px-6 py-3 text-white"
          >
            Contact Landlord
          </button>

          <button
            type="button"
            onClick={toggleFavorite}
            disabled={favoriteBusy}
            aria-pressed={isFavorite}
            className="rounded-lg border border-neutral-300 px-6 py-3 font-medium text-neutral-900 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isFavorite ? '♥ Saved' : '♡ Save property'}
          </button>
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
          Landlords can manage their own listings from the landlord dashboard.
        </div>
      )}
    </div>
  )
}
