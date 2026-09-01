"use client"

import { useEffect, useState } from "react"
import { workerRequirementsApi, projectsApi } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { HardHat, Calendar, Users, Plus, Clock } from "lucide-react"
import { LocationLink } from "@/components/ui/LocationLink"
import { CreateWorkerRequirementModal } from "@/components/requirements/CreateWorkerRequirementModal"
import { RequirementDetailsModal } from "@/components/requirements/RequirementDetailsModal"

export default function RequirementsPage() {
  const { user } = useAuth()
  const [requirements, setRequirements] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [reqRes, projRes] = await Promise.all([
        workerRequirementsApi.getAll(),
        projectsApi.getAll().catch(() => ({ data: [] })),
      ])
      setRequirements(reqRes.data || [])
      setProjects(projRes.data || [])
    } catch (error) {
      console.error("Failed to load requirements", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8 text-slate-500">Loading requirements...</div>
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Worker Requirements</h1>
          <p className="text-slate-500 mt-1">Manage workforce requests and site timings across your projects.</p>
        </div>
        
        {(user?.role === "site_manager" || user?.role === "company_admin") && (
          <Button onClick={() => setShowCreateModal(true)} className="flex items-center">
            <Plus className="w-4 h-4 mr-1.5" /> New Requirement
          </Button>
        )}
      </div>

      {requirements.length === 0 ? (
        <div className="text-center p-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
          <HardHat className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-700">No requirements found</h3>
          <p className="text-slate-500 mt-2">There are currently no active worker requirements.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {requirements.map((req) => (
            <Card key={req.id} className="flex flex-col hover:border-slate-300 transition-colors">
              <CardContent className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-800">{req.trade}</h3>
                    <p className="text-sm text-slate-500">{req.work_type} • {req.projects?.name || "Project"}</p>
                  </div>
                  <Badge variant={
                    req.status === "open" ? "success" : 
                    req.status === "filled" ? "default" : "secondary"
                  }>
                    {req.status?.replace("_", " ")}
                  </Badge>
                </div>
                
                <div className="space-y-2 text-sm text-slate-600 mb-6 flex-1 bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Headcount</span>
                    <span className="font-semibold text-slate-800">{req.headcount} workers</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                    <span className="text-slate-500">Location</span>
                    <LocationLink location={req.location} className="max-w-[170px] text-xs" />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                    <span className="text-slate-500">Start Date</span>
                    <span className="font-medium text-slate-800">{new Date(req.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                    <span className="text-slate-500">Timing</span>
                    <span className="font-medium text-slate-800 text-xs">{req.working_hours || "Standard"} ({req.duration || "1 day"})</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-between items-center mt-auto">
                  <div className="text-sm">
                    <span className="font-bold text-slate-800">₹{req.pay}</span>
                    <span className="text-slate-500 text-xs"> / {req.pay_basis?.replace("_", " ")}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelectedReqId(req.id)}>
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateWorkerRequirementModal
          projects={projects}
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchData}
        />
      )}

      {selectedReqId && (
        <RequirementDetailsModal
          requirementId={selectedReqId}
          onClose={() => setSelectedReqId(null)}
        />
      )}
    </div>
  )
}
