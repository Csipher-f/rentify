'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabaseClient'

type Conversation = {
  id: string
  property_id: string
  tenant_id: string
  landlord_id: string
  created_at: string
  property?: {
    title?: string | null
    location?: string | null
  } | {
    title?: string | null
    location?: string | null
  }[] | null
}

type Message = {
  id: string
  conversation_id: string
  sender_id: string
  message: string
  created_at: string
}

type MessagingInboxProps = {
  activeConversationId?: string
}

function formatTime(value?: string) {
  if (!value) return ''

  return new Intl.DateTimeFormat('en-NG', {
    hour: 'numeric',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
  }).format(new Date(value))
}

function getProperty(conversation: Conversation) {
  const property = conversation.property

  if (Array.isArray(property)) {
    return property[0] ?? null
  }

  return property ?? null
}

export default function MessagingInbox({
  activeConversationId,
}: MessagingInboxProps) {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [latestMessages, setLatestMessages] = useState<Record<string, Message>>({})
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [liveUnreadIds, setLiveUnreadIds] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const activeConversationIdRef = useRef(activeConversationId)

  const activeConversation = useMemo(
    () =>
      conversations.find((conversation) => conversation.id === activeConversationId) ??
      null,
    [activeConversationId, conversations]
  )

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId
  }, [activeConversationId])

  useEffect(() => {
    const fetchConversations = async () => {
      setLoadingConversations(true)
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
        .from('conversations')
        .select(
          `
            id,
            property_id,
            tenant_id,
            landlord_id,
            created_at,
            property:properties (
              title,
              location
            )
          `
        )
        .or(`tenant_id.eq.${user.id},landlord_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        console.log(error)
        setErrorMessage('Unable to load conversations right now.')
        setLoadingConversations(false)
        return
      }

      const nextConversations = ((data as Conversation[]) || []).map(
        (conversation) => ({
          ...conversation,
          property: getProperty(conversation),
        })
      )

      setConversations(nextConversations)

      if (nextConversations.length > 0) {
        const conversationIds = nextConversations.map((conversation) => conversation.id)
        const { data: latestData, error: latestError } = await supabase
          .from('messages')
          .select('id,conversation_id,sender_id,message,created_at')
          .in('conversation_id', conversationIds)
          .order('created_at', { ascending: false })
          .limit(300)

        if (latestError) {
          console.log(latestError)
        } else {
          const previews: Record<string, Message> = {}

          for (const message of (latestData as Message[]) || []) {
            if (!previews[message.conversation_id]) {
              previews[message.conversation_id] = message
            }
          }

          setLatestMessages(previews)
        }
      }

      setLoadingConversations(false)
    }

    fetchConversations()
  }, [router])

  useEffect(() => {
    if (!userId || conversations.length === 0) return

    const conversationIds = new Set(
      conversations.map((conversation) => conversation.id)
    )

    const channel = supabase
      .channel(`messages-inbox-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const incoming = payload.new as Message

          if (!conversationIds.has(incoming.conversation_id)) return

          setLatestMessages((current) => ({
            ...current,
            [incoming.conversation_id]: incoming,
          }))

          if (incoming.conversation_id === activeConversationIdRef.current) {
            setMessages((current) =>
              current.some((message) => message.id === incoming.id)
                ? current
                : [...current, incoming]
            )
          }

          if (
            incoming.sender_id !== userId &&
            incoming.conversation_id !== activeConversationIdRef.current
          ) {
            setLiveUnreadIds((current) => new Set(current).add(incoming.conversation_id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversations, userId])

  useEffect(() => {
    const fetchMessages = async () => {
      if (!activeConversationId || !userId) {
        setMessages([])
        return
      }

      setLoadingMessages(true)
      setErrorMessage('')
      setLiveUnreadIds((current) => {
        const next = new Set(current)
        next.delete(activeConversationId)
        return next
      })

      const { data, error } = await supabase
        .from('messages')
        .select('id,conversation_id,sender_id,message,created_at')
        .eq('conversation_id', activeConversationId)
        .order('created_at', { ascending: true })
        .limit(300)

      if (error) {
        console.log(error)
        setErrorMessage('Unable to load this conversation.')
        setLoadingMessages(false)
        return
      }

      setMessages((data as Message[]) || [])
      setLoadingMessages(false)
    }

    fetchMessages()
  }, [activeConversationId, userId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, activeConversationId])

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!activeConversationId || !newMessage.trim() || !userId) return

    const body = newMessage.trim()

    setSending(true)
    setNewMessage('')

    const { error } = await supabase.from('messages').insert({
      conversation_id: activeConversationId,
      sender_id: userId,
      message: body,
    })

    if (error) {
      setNewMessage(body)
      alert(error.message)
    }

    setSending(false)
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-6 text-neutral-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-4 lg:h-[calc(100vh-120px)] lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-200 p-5">
            <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
              Inbox
            </p>
            <h1 className="mt-1 text-2xl font-bold">Messages</h1>
          </div>

          <div className="max-h-[420px] overflow-y-auto lg:max-h-none lg:h-[calc(100%-81px)]">
            {loadingConversations ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-20 animate-pulse rounded-md bg-neutral-100"
                  />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-5 text-sm leading-6 text-neutral-500">
                No conversations yet. Start one from a property page.
              </div>
            ) : (
              conversations.map((conversation) => {
                const latest = latestMessages[conversation.id]
                const property = getProperty(conversation)
                const isActive = conversation.id === activeConversationId
                const isUnread =
                  liveUnreadIds.has(conversation.id) ||
                  Boolean(
                    latest &&
                      latest.sender_id !== userId &&
                      conversation.id !== activeConversationId
                  )

                return (
                  <Link
                    key={conversation.id}
                    href={`/messages/${conversation.id}`}
                    className={`block border-b border-neutral-100 p-4 transition hover:bg-neutral-50 ${
                      isActive ? 'bg-neutral-100' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">
                          {property?.title || 'Property conversation'}
                        </p>
                        <p className="mt-1 truncate text-sm text-neutral-500">
                          {latest?.message || 'No messages yet'}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span className="text-xs font-medium text-neutral-500">
                          {formatTime(latest?.created_at || conversation.created_at)}
                        </span>
                        {isUnread && (
                          <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                        )}
                      </div>
                    </div>
                    {property?.location && (
                      <p className="mt-2 truncate text-xs font-medium text-neutral-400">
                        {property.location}
                      </p>
                    )}
                  </Link>
                )
              })
            )}
          </div>
        </aside>

        <section className="flex min-h-[560px] flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
          {!activeConversationId ? (
            <div className="flex flex-1 items-center justify-center p-8 text-center">
              <div>
                <h2 className="text-2xl font-semibold">Select a conversation</h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-neutral-500">
                  Choose a message thread from the inbox to continue chatting.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="border-b border-neutral-200 p-5">
                <p className="text-sm font-medium text-neutral-500">
                  {activeConversation
                    ? getProperty(activeConversation)?.location || 'Conversation'
                    : 'Conversation'}
                </p>
                <h2 className="mt-1 truncate text-xl font-semibold">
                  {activeConversation
                    ? getProperty(activeConversation)?.title || 'Property conversation'
                    : 'Messages'}
                </h2>
              </div>

              <div className="flex-1 overflow-y-auto bg-neutral-100 p-4">
                {loadingMessages ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div
                        key={index}
                        className={`h-12 w-2/3 animate-pulse rounded-2xl bg-white ${
                          index % 2 === 0 ? 'mr-auto' : 'ml-auto'
                        }`}
                      />
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-center">
                    <p className="max-w-sm text-sm leading-6 text-neutral-500">
                      No messages yet. Send the first note to start the conversation.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((message) => {
                      const mine = message.sender_id === userId

                      return (
                        <div
                          key={message.id}
                          className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[82%] rounded-2xl px-4 py-2 shadow-sm sm:max-w-[68%] ${
                              mine
                                ? 'rounded-br-sm bg-blue-600 text-white'
                                : 'rounded-bl-sm bg-white text-neutral-900'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words text-sm leading-6">
                              {message.message}
                            </p>
                            <p
                              className={`mt-1 text-right text-[11px] ${
                                mine ? 'text-blue-100' : 'text-neutral-400'
                              }`}
                            >
                              {formatTime(message.created_at)}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {errorMessage && (
                <p className="border-t border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {errorMessage}
                </p>
              )}

              <form
                onSubmit={sendMessage}
                className="flex gap-2 border-t border-neutral-200 bg-white p-3"
              >
                <input
                  value={newMessage}
                  onChange={(event) => setNewMessage(event.target.value)}
                  placeholder="Type a message..."
                  className="h-11 min-w-0 flex-1 rounded-full border border-neutral-300 px-4 text-base outline-none transition focus:border-neutral-950"
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="h-11 rounded-full bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  )
}
