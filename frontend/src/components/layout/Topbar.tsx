"use client"

import { useState } from "react"
import { User, Menu } from "lucide-react"
import { NotificationsDropdown } from "@/components/layout/NotificationsDropdown"
import { UserProfileModal } from "@/components/layout/UserProfileModal"
import Image from "next/image"
import Link from "next/link"

interface TopbarProps {
  onMobileMenuToggle?: () => void
}

export function Topbar({ onMobileMenuToggle }: TopbarProps) {
  const [showProfileModal, setShowProfileModal] = useState(false)

  return (
    <>
      <header className="h-16 bg-card border-b border-divider flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          {/* Mobile Hamburger Button */}
          <button
            onClick={onMobileMenuToggle}
            className="p-2 -ml-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden cursor-pointer"
            aria-label="Open sidebar menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Mobile Logo Brand */}
          <Link href="/dashboard" className="flex items-center lg:hidden mr-1">
            <Image
              src="/name horizontal long logo.png"
              alt="CONCURIS"
              width={120}
              height={30}
              className="h-7 w-auto object-contain"
            />
          </Link>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-4">
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
