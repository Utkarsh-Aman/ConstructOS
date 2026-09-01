"use client"

import { useState } from "react"
import { Search, User } from "lucide-react"
import { NotificationsDropdown } from "@/components/layout/NotificationsDropdown"
import { UserProfileModal } from "@/components/layout/UserProfileModal"

export function Topbar() {
  const [showProfileModal, setShowProfileModal] = useState(false)

  return (
    <>
      <header className="h-16 bg-card border-b border-divider flex items-center justify-between px-8 sticky top-0 z-10">
        <div className="flex items-center w-96">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search projects, materials..."
              className="w-full bg-background border border-divider rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <NotificationsDropdown />
          
          <button
            onClick={() => setShowProfileModal(true)}
            className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center hover:bg-primary/20 transition-colors cursor-pointer"
            title="View Account Profile"
          >
            <User className="h-5 w-5 text-primary" />
          </button>
        </div>
      </header>

      {showProfileModal && (
        <UserProfileModal onClose={() => setShowProfileModal(false)} />
      )}
    </>
  )
}
