"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { MapPin, Truck, Users, Package } from "lucide-react"
import { projectsApi, workerRequirementsApi, materialRequestsApi, deliveriesApi } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

export default function DashboardOverview() {
  const { user } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({
    activeProjects: 0,
    workforceDeployed: 0,
    pendingDeliveries: 0,
    materialRequests: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.role === "worker" || user?.role === "group_leader") {
      router.push("/dashboard/available-work")
      return
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        
        // Fetch all data concurrently
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

        // Calculate stats
        const activeProjectsCount = projects.length
        
        // Calculate workforce deployed (sum of headcounts from filled/partially filled requirements)
        const workforceDeployed = requirements.reduce((acc: number, req: any) => {
          return acc + (req.headcount || 0)
        }, 0)

        // Calculate pending deliveries (all non-delivered)
        const pendingDeliveries = deliveries.filter((d: any) => d.status !== 'delivered').length

        // Total material requests
        const totalMaterialRequests = materials.length

        setStats({
          activeProjects: activeProjectsCount,
          workforceDeployed,
          pendingDeliveries,
          materialRequests: totalMaterialRequests,
        })
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-nav">Dashboard</h1>
        <p className="text-foreground/70 mt-2">Overview of your active construction projects and resources.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-foreground/70">Active Projects</CardTitle>
            <MapPin className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-2xl font-bold animate-pulse text-slate-300">...</div>
            ) : (
              <div className="text-2xl font-bold">{stats.activeProjects}</div>
            )}
            <p className="text-xs text-foreground/50 mt-1">Total managed projects</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-foreground/70">Workforce Deployed</CardTitle>
            <Users className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-2xl font-bold animate-pulse text-slate-300">...</div>
            ) : (
              <div className="text-2xl font-bold">{stats.workforceDeployed}</div>
            )}
            <p className="text-xs text-foreground/50 mt-1">Total required headcount</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-foreground/70">Pending Deliveries</CardTitle>
            <Truck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-2xl font-bold animate-pulse text-slate-300">...</div>
            ) : (
              <div className="text-2xl font-bold text-primary">{stats.pendingDeliveries}</div>
            )}
            <p className="text-xs text-foreground/50 mt-1">Requires attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-foreground/70">Material Requests</CardTitle>
            <Package className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-2xl font-bold animate-pulse text-slate-300">...</div>
            ) : (
              <div className="text-2xl font-bold">{stats.materialRequests}</div>
            )}
            <p className="text-xs text-foreground/50 mt-1">Total requests made</p>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
