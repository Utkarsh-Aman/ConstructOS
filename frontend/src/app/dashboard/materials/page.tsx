"use client"

import { useEffect, useState } from "react"
import { materialRequestsApi, projectsApi } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Package, Plus } from "lucide-react"
import { CreateMaterialRequestModal } from "@/components/materials/CreateMaterialRequestModal"
import { MaterialRequestDetailsModal } from "@/components/materials/MaterialRequestDetailsModal"
import { CompareQuotesModal } from "@/components/materials/CompareQuotesModal"

export default function MaterialsPage() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null)
  const [compareReqId, setCompareReqId] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [matRes, projRes] = await Promise.all([
        materialRequestsApi.getAll(),
        projectsApi.getAll().catch(() => ({ data: [] })),
      ])
      setRequests(matRes.data || [])
      setProjects(projRes.data || [])
    } catch (error) {
      console.error("Failed to load material requests", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "success"
      case "draft": return "secondary"
      case "rejected": return "danger"
      default: return "default"
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8 text-slate-500">Loading materials...</div>
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Material Requests</h1>
          <p className="text-slate-500 mt-1">Manage and track material procurement for your projects.</p>
        </div>
        
        {(user?.role === "site_manager" || user?.role === "company_admin") && (
          <Button onClick={() => setShowCreateModal(true)} className="flex items-center">
            <Plus className="w-4 h-4 mr-1.5" /> New Request
          </Button>
        )}
      </div>

      {requests.length === 0 ? (
        <div className="text-center p-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
          <Package className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-700">No material requests</h3>
          <p className="text-slate-500 mt-2">There are currently no active material requests.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {requests.map((req) => (
            <Card key={req.id} className="flex flex-col hover:border-slate-300 transition-colors">
              <CardContent className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 pr-2">
                    <h3 className="font-bold text-lg text-slate-800 line-clamp-1">{req.material}</h3>
                    <p className="text-xs text-slate-500 mt-1">Project: {req.projects?.name || "N/A"}</p>
                  </div>
                  <Badge variant={getStatusColor(req.status) as any}>
                    {req.status?.replace("_", " ")}
                  </Badge>
                </div>
                
                <div className="space-y-2 text-sm text-slate-600 mb-6 flex-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Quantity</span>
                    <span className="font-medium text-slate-800">{req.quantity} {req.unit}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                    <span className="text-slate-500">Required By</span>
                    <span className="font-medium text-slate-800">{new Date(req.required_by_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                    <span className="text-slate-500">Priority</span>
                    <span className="font-medium capitalize text-slate-800">{req.priority}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-auto">
                  <Button variant="outline" className="flex-1" size="sm" onClick={() => setSelectedReqId(req.id)}>
                    View & Action
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateMaterialRequestModal
          projects={projects}
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchData}
        />
      )}

      {selectedReqId && (
        <MaterialRequestDetailsModal
          requestId={selectedReqId}
          onClose={() => setSelectedReqId(null)}
          onUpdate={fetchData}
          onCompareQuotes={(reqId) => setCompareReqId(reqId)}
        />
      )}

      {compareReqId && (
        <CompareQuotesModal
          materialRequestId={compareReqId}
          onClose={() => setCompareReqId(null)}
        />
      )}
    </div>
  )
}
