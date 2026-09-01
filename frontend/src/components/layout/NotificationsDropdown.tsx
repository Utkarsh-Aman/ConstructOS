"use client"

import { useEffect, useState, useRef } from "react"
import { notificationsApi } from "@/lib/api"
import { Bell, CheckCheck, Circle, Clock } from "lucide-react"

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 15000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const fetchNotifications = async () => {
    try {
      const res = await notificationsApi.getAll()
      setNotifications(res.data.notifications || [])
      setUnreadCount(res.data.unread_count || 0)
    } catch (err) {
      // Silent fail if unauthenticated
    }
  }

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id)
      fetchNotifications()
    } catch (err) {
      console.error(err)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead()
      fetchNotifications()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-slate-500 hover:text-slate-800 transition-colors rounded-full hover:bg-slate-100 cursor-pointer"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
              <p className="text-xs text-slate-500">{unreadCount} unread alerts</p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-primary font-medium hover:underline flex items-center"
              >
                <CheckCheck className="w-3.5 h-3.5 mr-1" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No notifications right now.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.read_at && handleMarkRead(n.id)}
                  className={`p-3.5 text-xs transition-colors cursor-pointer flex items-start space-x-3 ${
                    !n.read_at ? "bg-blue-50/40 hover:bg-blue-50/70" : "hover:bg-slate-50"
                  }`}
                >
                  {!n.read_at ? (
                    <Circle className="w-2 h-2 text-primary fill-primary mt-1 shrink-0" />
                  ) : (
                    <div className="w-2 h-2 shrink-0" />
                  )}
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold text-slate-800 capitalize">
                      {n.type?.replace(/_/g, " ")}
                    </p>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      {n.payload_json?.material 
                        ? `Material "${n.payload_json.material}" status updated to ${n.payload_json.new_status}.`
                        : n.payload_json?.worker_name
                        ? `Worker ${n.payload_json.worker_name} submitted a response.`
                        : JSON.stringify(n.payload_json)}
                    </p>
                    <div className="text-[10px] text-slate-400 flex items-center pt-1">
                      <Clock className="w-3 h-3 mr-1" />
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
