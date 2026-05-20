'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabaseClient'

export default function OnboardingPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()

      if (!data.user) {
        router.push('/auth')
        return
      }

      setUserId(data.user.id)
    }

    getUser()
  }, [router])

  const selectRole = async (role: 'tenant' | 'landlord') => {
    if (!userId) return

    setLoading(true)

    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)

    setLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md border rounded-xl p-6">
        <h1 className="text-3xl font-bold text-center">
          Welcome to Rentify
        </h1>

        <p className="text-center mt-2 text-gray-500">
          Choose how you want to use Rentify
        </p>

        <button
          onClick={() => selectRole('tenant')}
          disabled={loading}
          className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg"
        >
          I’m a Tenant
        </button>

        <button
          onClick={() => selectRole('landlord')}
          disabled={loading}
          className="w-full mt-4 bg-green-600 text-white py-3 rounded-lg"
        >
          I’m a Landlord
        </button>
      </div>
    </div>
  )
}
