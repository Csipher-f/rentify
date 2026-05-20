'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import PropertyCard, { PropertyCardData } from '@/components/PropertyCard'
import { supabase } from '@/src/lib/supabaseClient'

type Profile = {
  id: string
  role: string | null
}

type PropertyRow = PropertyCardData & {
  owner_id: string
  created_at: string
}

export default function DashboardPropertiesPage() {
  const router = useRouter()
  const [properties, setProperties] = useState<PropertyRow[]>([])
  const [deleteTarget, setDeleteTarget] = useState<PropertyRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const fetchLandlordProperties = async () => {
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
        .select('id,owner_id,title,description,price,location,image_url,created_at')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        setErrorMessage(error.message)
        setLoading(false)
        return
      }

      setProperties((data as PropertyRow[]) || [])
      setLoading(false)
    }

    fetchLandlordProperties()
  }, [router])

  const deleteProperty = async () => {
    if (!deleteTarget) return

    setDeleting(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/auth')
      return
    }

    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', deleteTarget.id)
      .eq('owner_id', user.id)

    if (error) {
      setErrorMessage(error.message)
      setDeleting(false)
      setDeleteTarget(null)
      return
    }

    setProperties((current) =>
      current.filter((property) => property.id !== deleteTarget.id)
    )
    setDeleting(false)
    setDeleteTarget(null)
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-8 text-neutral-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
              Landlord dashboard
            </p>
            <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
              My properties
            </h1>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-md border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100"
          >
            Add property
          </Link>
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
        ) : properties.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed border-neutral-300 bg-white px-6 py-12 text-center">
            <h2 className="text-xl font-semibold">No properties listed yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500">
              Add your first rental from the dashboard and it will appear here.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-flex h-11 items-center rounded-md bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Add property
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                actions={
                  <>
                    <Link
                      href={`/dashboard/properties/${property.id}/edit`}
                      className="inline-flex h-10 flex-1 items-center justify-center rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(property)}
                      className="h-10 flex-1 rounded-md border border-red-200 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </>
                }
              />
            ))}
          </div>
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold">Delete property?</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              This will remove {deleteTarget.title} from Rentify. This action
              cannot be undone.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="h-11 rounded-md border border-neutral-300 px-5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteProperty}
                disabled={deleting}
                className="h-11 rounded-md bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? 'Deleting...' : 'Delete property'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
