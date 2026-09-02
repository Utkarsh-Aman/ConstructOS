"use client"

import React, { useState } from "react"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row">
      <Sidebar 
        mobileOpen={mobileOpen} 
        onMobileClose={() => setMobileOpen(false)} 
      />
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <Topbar onMobileMenuToggle={() => setMobileOpen(prev => !prev)} />
        <main className="flex-1 p-3 sm:p-5 lg:p-8 max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
