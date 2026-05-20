'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ChangeEvent, FormEvent, useEffect, useState } from 'react'
import { supabase } from '@/src/lib/supabaseClient'

type Profile = {
  id: string
  role: string | null
}

type PropertyForm = {
  id: string
  owner_id: string
  title: string
  description: string
  price: string
  location: string
  image_url: string | null
}

export default function EditPropertyPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [form, setForm] = useState<PropertyForm | null>(null)
  const [image, setImage] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const fetchProperty = async () => {
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

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id,role')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) {
        setErrorMessage(profileError.message)
        setLoading(false)
        return
      }

      if ((profile as Profile | null)?.role !== 'landlord') {
        router.push('/dashboard')
        return
      }

      const { data, error } = await supabase
        .from('properties')
        .select('id,owner_id,title,description,price,location,image_url')
        .eq('id', id)
        .eq('owner_id', user.id)
        .maybeSingle()

      if (error) {
        setErrorMessage(error.message)
        setLoading(false)
        return
      }

      if (!data) {
        setErrorMessage('Property not found or you do not have access to edit it.')
        setLoading(false)
        return
      }

      setForm({
        id: data.id,
        owner_id: data.owner_id,
        title: data.title,
        description: data.description ?? '',
        price: String(data.price ?? ''),
        location: data.location,
        image_url: data.image_url,
      })
      setLoading(false)
    }

    fetchProperty()
  }, [id, router])

  const updateField = (
    field: keyof Pick<PropertyForm, 'title' | 'description' | 'price' | 'location'>,
    value: string
  ) => {
    setForm((current) => (current ? { ...current, [field]: value } : current))
  }

  const updateImage = (event: ChangeEvent<HTMLInputElement>) => {
    setImage(event.target.files?.[0] ?? null)
  }

  const saveProperty = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!form) return

    const price = Number(form.price)

    if (!form.title.trim() || !form.location.trim()) {
      setErrorMessage('Title and location are required.')
      return
    }

    if (!Number.isFinite(price) || price < 0) {
      setErrorMessage('Enter a valid positive price.')
      return
    }

    setSaving(true)
    setErrorMessage('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/auth')
      return
    }

    let imageUrl = form.image_url

    if (image) {
      const extension = image.name.split('.').pop()
      const safeExtension = extension ? `.${extension}` : ''
      const fileName = `${user.id}/${Date.now()}-${crypto.randomUUID()}${safeExtension}`

      const { error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(fileName, image, { upsert: false })

      if (uploadError) {
        setErrorMessage(uploadError.message)
        setSaving(false)
        return
      }

      const { data } = supabase.storage
        .from('property-images')
        .getPublicUrl(fileName)

      imageUrl = data.publicUrl
    }

    const { error } = await supabase
      .from('properties')
      .update({
        title: form.title.trim(),
        description: form.description.trim(),
        price,
        location: form.location.trim(),
        image_url: imageUrl,
      })
      .eq('id', form.id)
      .eq('owner_id', user.id)

    if (error) {
      setErrorMessage(error.message)
      setSaving(false)
      return
    }

    router.push('/dashboard/properties')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-50 px-4 py-8 text-neutral-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-lg border border-neutral-200 bg-white p-6">
          <p className="text-sm font-medium text-neutral-600">Loading property...</p>
        </div>
      </main>
    )
  }

  if (!form) {
    return (
      <main className="min-h-screen bg-neutral-50 px-4 py-8 text-neutral-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-lg border border-neutral-200 bg-white p-6">
          <h1 className="text-2xl font-bold">Property unavailable</h1>
          {errorMessage && <p className="mt-2 text-sm text-red-700">{errorMessage}</p>}
          <Link
            href="/dashboard/properties"
            className="mt-6 inline-flex h-11 items-center rounded-md bg-neutral-950 px-5 text-sm font-semibold text-white"
          >
            Back to properties
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-8 text-neutral-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
            Landlord dashboard
          </p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Edit property</h1>
        </div>

        <form
          onSubmit={saveProperty}
          className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm"
        >
          {form.image_url && (
            <div className="relative mb-5 h-64 w-full overflow-hidden rounded-lg">
              <Image
                src={form.image_url}
                alt={form.title}
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
              />
            </div>
          )}

          <div className="grid gap-4">
            <label className="flex flex-col gap-2 text-sm font-medium text-neutral-700">
              Title
              <input
                value={form.title}
                onChange={(event) => updateField('title', event.target.value)}
                className="h-11 rounded-md border border-neutral-300 px-3 text-base text-neutral-950 outline-none transition focus:border-neutral-950"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-neutral-700">
              Description
              <textarea
                value={form.description}
                onChange={(event) => updateField('description', event.target.value)}
                rows={5}
                className="rounded-md border border-neutral-300 px-3 py-2 text-base text-neutral-950 outline-none transition focus:border-neutral-950"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-neutral-700">
                Price
                <input
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(event) => updateField('price', event.target.value)}
                  className="h-11 rounded-md border border-neutral-300 px-3 text-base text-neutral-950 outline-none transition focus:border-neutral-950"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-neutral-700">
                Location
                <input
                  value={form.location}
                  onChange={(event) => updateField('location', event.target.value)}
                  className="h-11 rounded-md border border-neutral-300 px-3 text-base text-neutral-950 outline-none transition focus:border-neutral-950"
                />
              </label>
            </div>

            <label className="flex flex-col gap-2 text-sm font-medium text-neutral-700">
              Replace image
              <input
                type="file"
                accept="image/*"
                onChange={updateImage}
                className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700"
              />
            </label>
          </div>

          {image && (
            <p className="mt-3 text-sm font-medium text-neutral-600">
              New image selected: {image.name}
            </p>
          )}

          {errorMessage && (
            <p className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {errorMessage}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/dashboard/properties"
              className="inline-flex h-11 items-center justify-center rounded-md border border-neutral-300 px-5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="h-11 rounded-md bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
