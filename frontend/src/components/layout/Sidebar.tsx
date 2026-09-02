"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, HardHat, FileText, Truck, Users, Package, Settings, LogOut, Bot } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"

import Image from "next/image"

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

  const navItems = [
    { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["company_admin", "site_manager", "vendor"] },
    
    // Admin & Site Manager
    { title: "Projects", href: "/dashboard/projects", icon: HardHat, roles: ["company_admin", "site_manager"] },
    { title: "AI Project Query", href: "/dashboard/ai-query", icon: Bot, roles: ["company_admin", "site_manager"] },
    { title: "Requirements", href: "/dashboard/requirements", icon: Users, roles: ["company_admin", "site_manager"] },
    { title: "Materials", href: "/dashboard/materials", icon: Package, roles: ["company_admin", "site_manager"] },
    { title: "Deliveries", href: "/dashboard/deliveries", icon: Truck, roles: ["company_admin", "site_manager", "vendor", "driver"] },
    
    // Vendor
    { title: "RFPs / Requests", href: "/dashboard/rfps", icon: FileText, roles: ["vendor"] },
    { title: "My Quotes", href: "/dashboard/my-quotes", icon: FileText, roles: ["vendor"] },
    { title: "Fleet", href: "/dashboard/fleet", icon: Truck, roles: ["vendor"] },
    
    // Worker & Group Leader
    { title: "Available Work", href: "/dashboard/available-work", icon: HardHat, roles: ["worker", "group_leader"] },
    { title: "My Work", href: "/dashboard/my-work", icon: FileText, roles: ["worker", "group_leader"] },
    { title: "My Group", href: "/dashboard/group", icon: Users, roles: ["group_leader"] },
  ]

  const filteredNav = navItems.filter(item => !user || item.roles.includes(user.role))

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  return (
    <aside className="w-64 bg-nav text-white flex flex-col h-screen fixed top-0 left-0 z-20">
      <div className="h-16 flex items-center px-5 border-b border-white/10">
        <Image
          src="/name horizontal long logo.png"
          alt="CONCURIS"
          width={150}
          height={36}
          className="h-8 w-auto object-contain brightness-0 invert"
          priority
        />
      </div>
      
      <div className="px-6 pt-4 pb-2 text-xs text-white/50 uppercase tracking-wider font-semibold">
        {user ? user.role.replace("_", " ") : "Loading..."}
      </div>

      <nav className="flex-1 py-2 px-3 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary text-white" 
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
              {item.title}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-white/10 shrink-0">
        <Link
          href="/dashboard/settings"
          className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
        >
          <Settings className="h-5 w-5 mr-3" />
          Settings
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-red-500/20 hover:text-red-400 transition-colors mt-1 cursor-pointer"
        >
          <LogOut className="h-5 w-5 mr-3" />
          Logout
        </button>
      </div>
    </aside>
  )
}
