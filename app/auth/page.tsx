'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabaseClient'

export default function AuthPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const login = async () => {
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    router.push('/dashboard')
  }

  const signup = async () => {
    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    alert('Check your email to confirm account')
    router.push('/dashboard')
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Rentify Auth</h1>

      <input
        className="border p-2 mt-4 block"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        className="border p-2 mt-2 block"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        className="bg-blue-500 text-white px-4 py-2 mt-4 mr-2"
        onClick={login}
        disabled={loading}
      >
        Login
      </button>

      <button
        className="bg-green-500 text-white px-4 py-2 mt-4"
        onClick={signup}
        disabled={loading}
      >
        Signup
      </button>
    </div>
  )
}