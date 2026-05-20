'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabaseClient'

type Notification = {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read: boolean
  created_at: string
}

function formatNotificationTime(value: string) {
  return new Intl.DateTimeFormat('en-NG', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export default function NotificationsDropdown() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
  const panelRef = useRef<HTMLDivElement | null>(null)

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  )

  useEffect(() => {
    const loadNotifications = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      setUserId(user.id)

      const { data, error } = await supabase
        .from('notifications')
        .select('id,user_id,type,title,body,link,read,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        console.log(error)
        setLoading(false)
        return
      }

      setNotifications((data as Notification[]) || [])
      setLoading(false)
    }

    loadNotifications()
  }, [])

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const incoming = payload.new as Notification

            setNotifications((current) => [
              incoming,
              ...current.filter((notification) => notification.id !== incoming.id),
            ].slice(0, 20))
          }

          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Notification

            setNotifications((current) =>
              current.map((notification) =>
                notification.id === updated.id ? updated : notification
              )
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', closeOnOutsideClick)

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
    }
  }, [])

  const markAsRead = async (notificationId: string) => {
    if (!userId) return

    setBusyIds((current) => new Set(current).add(notificationId))
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    )

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', userId)

    if (error) {
      console.log(error)
    }

    setBusyIds((current) => {
      const next = new Set(current)
      next.delete(notificationId)
      return next
    })
  }

  const markAllAsRead = async () => {
    if (!userId || unreadCount === 0) return

    setNotifications((current) =>
      current.map((notification) => ({ ...notification, read: true }))
    )

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)

    if (error) {
      console.log(error)
    }
  }

  const openNotification = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id)
    }

    setOpen(false)

    if (notification.link) {
      router.push(notification.link)
    }
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium transition hover:bg-neutral-100"
        aria-label="Notifications"
        aria-expanded={open}
      >
        Notifications
        {unreadCount > 0 && (
          <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xl sm:w-96">
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Notifications</p>
              <p className="text-xs text-neutral-500">
                {unreadCount} unread
              </p>
            </div>
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="text-xs font-semibold text-blue-600 disabled:text-neutral-300"
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-16 animate-pulse rounded-md bg-neutral-100"
                  />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-neutral-500">
                No notifications yet.
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => openNotification(notification)}
                  disabled={busyIds.has(notification.id)}
                  className="flex w-full gap-3 border-b border-neutral-100 px-4 py-3 text-left transition hover:bg-neutral-50 disabled:cursor-wait"
                >
                  <span
                    className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${
                      notification.read ? 'bg-neutral-200' : 'bg-blue-600'
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-neutral-950">
                      {notification.title}
                    </span>
                    {notification.body && (
                      <span className="mt-1 line-clamp-2 block text-sm leading-5 text-neutral-600">
                        {notification.body}
                      </span>
                    )}
                    <span className="mt-2 block text-xs font-medium text-neutral-400">
                      {formatNotificationTime(notification.created_at)}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
