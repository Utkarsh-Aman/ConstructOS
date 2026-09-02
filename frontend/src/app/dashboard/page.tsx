"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { MapPin, Truck, Users, Package, FileText, ArrowRight, User, CheckCircle2 } from "lucide-react"
import { projectsApi, workerRequirementsApi, materialRequestsApi, deliveriesApi, vendorsApi } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

export default function DashboardOverview() {
  const { user } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({
    activeProjects: 0,
    workforceDeployed: 0,
    pendingDeliveries: 0,
    materialRequests: 0,
    openRfps: 0,
    myQuotes: 0,
    registeredDrivers: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.role === "worker" || user?.role === "group_leader") {
      router.push("/dashboard/available-work")
      return
    }
    if (user?.role === "driver") {
      router.push("/dashboard/deliveries")
      return
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        
        if (user?.role === "vendor") {
          const [rfpsRes, quotesRes, delRes, drvRes] = await Promise.all([
            vendorsApi.getOpenRfps().catch(() => ({ data: [] })),
            vendorsApi.getMyQuotes().catch(() => ({ data: [] })),
            deliveriesApi.getAll().catch(() => ({ data: [] })),
            vendorsApi.getDrivers().catch(() => ({ data: [] })),
          ])
          setStats({
            activeProjects: 0,
            workforceDeployed: 0,
            pendingDeliveries: (delRes.data || []).filter((d: any) => d.status !== "delivered").length,
            materialRequests: 0,
            openRfps: (rfpsRes.data || []).length,
            myQuotes: (quotesRes.data || []).length,
            registeredDrivers: (drvRes.data || []).length,
          })
        } else {
          // Company Admin & Site Manager
          const [projectsRes, workersRes, materialsRes, deliveriesRes] = await Promise.all([
            projectsApi.getAll().catch(() => ({ data: [] })),
            workerRequirementsApi.getAll().catch(() => ({ data: [] })),
            materialRequestsApi.getAll().catch(() => ({ data: [] })),
            deliveriesApi.getAll().catch(() => ({ data: [] }))
          ])

          const projects = projectsRes.data || []
          const requirements = workersRes.data || []
          const materials = materialsRes.data || []
          const deliveries = deliveriesRes.data || []

          setStats({
            activeProjects: projects.length,
            workforceDeployed: requirements.reduce((acc: number, req: any) => acc + (req.headcount || 0), 0),
            pendingDeliveries: deliveries.filter((d: any) => d.status !== 'delivered').length,
            materialRequests: materials.length,
            openRfps: 0,
            myQuotes: 0,
            registeredDrivers: 0,
          })
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchDashboardData()
    }
  }, [user, router])

  if (user?.role === "worker" || user?.role === "group_leader") {
    return <div className="flex justify-center p-8 text-slate-500">Redirecting to available work...</div>
  }

  // ── Vendor Specialized Dashboard ──────────────────────────────────────────
  if (user?.role === "vendor") {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 pb-3 sm:pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800">Vendor Operations Hub</h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              Live material demand marketplace, quotation bids, and fleet dispatch logistics.
            </p>
          </div>
          <Link href="/dashboard/rfps">
            <Button size="sm" className="text-xs flex items-center gap-1.5 shadow-xs cursor-pointer">
              <Package className="w-3.5 h-3.5" /> Browse Open Demands
            </Button>
          </Link>
        </div>

        <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
              <CardTitle className="text-xs sm:text-sm font-medium text-slate-500">Open Demands</CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {loading ? (
                <div className="text-xl font-bold animate-pulse text-slate-300">...</div>
              ) : (
                <div className="text-2xl font-bold text-slate-800">{stats.openRfps}</div>
              )}
              <p className="text-[11px] text-slate-400 mt-1">Available for bidding</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
              <CardTitle className="text-xs sm:text-sm font-medium text-slate-500">My Quotations</CardTitle>
              <FileText className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {loading ? (
                <div className="text-xl font-bold animate-pulse text-slate-300">...</div>
              ) : (
                <div className="text-2xl font-bold text-slate-800">{stats.myQuotes}</div>
              )}
              <p className="text-[11px] text-slate-400 mt-1">Submitted bids</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
              <CardTitle className="text-xs sm:text-sm font-medium text-slate-500">Pending Deliveries</CardTitle>
              <Truck className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {loading ? (
                <div className="text-xl font-bold animate-pulse text-slate-300">...</div>
              ) : (
                <div className="text-2xl font-bold text-slate-800">{stats.pendingDeliveries}</div>
              )}
              <p className="text-[11px] text-slate-400 mt-1">Active shipments</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
              <CardTitle className="text-xs sm:text-sm font-medium text-slate-500">Fleet Drivers</CardTitle>
              <User className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {loading ? (
                <div className="text-xl font-bold animate-pulse text-slate-300">...</div>
              ) : (
                <div className="text-2xl font-bold text-slate-800">{stats.registeredDrivers}</div>
              )}
              <p className="text-[11px] text-slate-400 mt-1">Registered drivers</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Access Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/dashboard/rfps" className="group block">
            <Card className="p-5 border-slate-200 hover:border-primary/50 transition-all hover:shadow-md group-hover:-translate-y-0.5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Package className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base group-hover:text-primary transition-colors">
                  Material Demands & RFPs
                </h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Explore live requests for materials across all companies and apply to supply.
              </p>
            </Card>
          </Link>

          <Link href="/dashboard/my-quotes" className="group block">
            <Card className="p-5 border-slate-200 hover:border-emerald-400 transition-all hover:shadow-md group-hover:-translate-y-0.5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base group-hover:text-emerald-700 transition-colors">
                  My Submitted Quotes
                </h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Track status of your bids, acceptances, and withdrawal requests.
              </p>
            </Card>
          </Link>

          <Link href="/dashboard/fleet" className="group block">
            <Card className="p-5 border-slate-200 hover:border-amber-400 transition-all hover:shadow-md group-hover:-translate-y-0.5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                  <Truck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base group-hover:text-amber-700 transition-colors">
                  Fleet & Dispatch Logistics
                </h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Register vehicles and drivers, generate GPS tracking links, and manage dispatches.
              </p>
            </Card>
          </Link>
        </div>
      </div>
    )
  }

  // ── Company Admin & Site Manager Dashboard ───────────────────────────────
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Overview of your active construction projects, resources, and dispatches.</p>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-slate-500">Active Projects</CardTitle>
            <MapPin className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {loading ? (
              <div className="text-xl font-bold animate-pulse text-slate-300">...</div>
            ) : (
              <div className="text-2xl font-bold text-slate-800">{stats.activeProjects}</div>
            )}
            <p className="text-[11px] text-slate-400 mt-1">Total managed projects</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-slate-500">Workforce Deployed</CardTitle>
            <Users className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {loading ? (
              <div className="text-xl font-bold animate-pulse text-slate-300">...</div>
            ) : (
              <div className="text-2xl font-bold text-slate-800">{stats.workforceDeployed}</div>
            )}
            <p className="text-[11px] text-slate-400 mt-1">Total required headcount</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-slate-500">Pending Deliveries</CardTitle>
            <Truck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {loading ? (
              <div className="text-xl font-bold animate-pulse text-slate-300">...</div>
            ) : (
              <div className="text-2xl font-bold text-primary">{stats.pendingDeliveries}</div>
            )}
            <p className="text-[11px] text-slate-400 mt-1">Active shipments</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-slate-500">Material Requests</CardTitle>
            <Package className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {loading ? (
              <div className="text-xl font-bold animate-pulse text-slate-300">...</div>
            ) : (
              <div className="text-2xl font-bold text-slate-800">{stats.materialRequests}</div>
            )}
            <p className="text-[11px] text-slate-400 mt-1">Total requests made</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
