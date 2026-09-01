"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { projectsApi, masterPlansApi } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Briefcase, FileText, Package, Users, Plus, UserPlus, Download, ExternalLink, Clock, UserCheck, Trash2, Mail, Phone } from "lucide-react"
import { LocationLink } from "@/components/ui/LocationLink"
import UploadMasterPlanModal from "@/components/projects/UploadMasterPlanModal"
import AssignSiteManagerModal from "@/components/projects/AssignSiteManagerModal"
import { CreateWorkerRequirementModal } from "@/components/requirements/CreateWorkerRequirementModal"
import { CreateMaterialRequestModal } from "@/components/materials/CreateMaterialRequestModal"
import { RequirementDetailsModal } from "@/components/requirements/RequirementDetailsModal"
import { MaterialRequestDetailsModal } from "@/components/materials/MaterialRequestDetailsModal"
import { CompareQuotesModal } from "@/components/materials/CompareQuotesModal"

export default function ProjectDetailsPage() {
  const params = useParams()
  const projectId = params.id as string
  const { user } = useAuth()

  const [project, setProject] = useState<any>(null)
  const [siteManagers, setSiteManagers] = useState<any[]>([])
  const [masterPlans, setMasterPlans] = useState<any[]>([])
  const [workerReqs, setWorkerReqs] = useState<any[]>([])
  const [materialReqs, setMaterialReqs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Modal triggers
  const [showUploadPlan, setShowUploadPlan] = useState(false)
  const [showAssignManager, setShowAssignManager] = useState(false)
  const [showCreateWorkerReq, setShowCreateWorkerReq] = useState(false)
  const [showCreateMaterialReq, setShowCreateMaterialReq] = useState(false)
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null)
  const [selectedMatReqId, setSelectedMatReqId] = useState<string | null>(null)
  const [compareMatReqId, setCompareMatReqId] = useState<string | null>(null)

  useEffect(() => {
    if (projectId) {
      fetchProjectData()
    }
  }, [projectId])

  const fetchProjectData = async () => {
    try {
      setLoading(true)
      const [projRes, smRes, mpRes, wrRes, mrRes] = await Promise.all([
        projectsApi.getById(projectId),
        projectsApi.getSiteManagers(projectId).catch(() => ({ data: [] })),
        projectsApi.getMasterPlans(projectId).catch(() => ({ data: [] })),
        projectsApi.getWorkerRequirements(projectId).catch(() => ({ data: [] })),
        projectsApi.getMaterialRequests(projectId).catch(() => ({ data: [] })),
      ])
      setProject(projRes.data)
      setSiteManagers(smRes.data || [])
      setMasterPlans(mpRes.data || [])
      setWorkerReqs(wrRes.data || [])
      setMaterialReqs(mrRes.data || [])
    } catch (error) {
      console.error("Failed to load project", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveSiteManager = async (smUserId: string) => {
    if (!confirm("Are you sure you want to remove this site manager assignment?")) return
    try {
      await projectsApi.removeSiteManager(projectId, smUserId)
      fetchProjectData()
    } catch (err) {
      console.error("Failed to remove site manager", err)
    }
  }

  const handleDownloadPlan = async (planId: string, versionId: string) => {
    try {
      const res = await masterPlansApi.getDownloadUrl(planId, versionId)
      if (res.data?.signed_url) {
        window.open(res.data.signed_url, "_blank")
      }
    } catch (err) {
      console.error("Failed to get download URL", err)
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8 text-slate-500">Loading project details...</div>
  }

  if (!project) {
    return <div className="flex justify-center p-8 text-slate-500">Project not found</div>
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">{project.name}</h1>
            {user?.role === "company_admin" && (
              <div
                className="relative group cursor-pointer"
                onClick={async () => {
                  const newStatus = project.status === "active" ? "archived" : "active"
                  try {
                    await projectsApi.updateStatus(projectId, newStatus)
                    fetchProjectData()
                  } catch (err) {
                    console.error("Failed to update status", err)
                  }
                }}
              >
                <Badge variant={project.status === "active" ? "success" : "default"} className="transition-all group-hover:opacity-80">
                  {project.status || "Active"}
                </Badge>
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none z-10">
                  Click to {project.status === "active" ? "Archive" : "Activate"}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center text-slate-500 mt-2 text-sm gap-4">
            <span className="flex items-center"><Briefcase className="w-4 h-4 mr-1" /> {project.companies?.name || "Company"}</span>
            <LocationLink location={project.location} />
          </div>
          {project.description && (
            <p className="mt-4 text-slate-600 text-sm max-w-3xl leading-relaxed bg-slate-50 p-4 rounded-md border border-slate-100">
              {project.description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          {user?.role === "company_admin" && (
            <button
              onClick={() => setShowAssignManager(true)}
              className="text-sm flex items-center bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3.5 py-2 rounded-md font-medium transition-colors shadow-sm cursor-pointer"
            >
              <UserPlus className="w-4 h-4 mr-2 text-primary" /> Assign Site Manager
            </button>
          )}

          {(user?.role === "site_manager" || user?.role === "company_admin") && (
            <>
              <button
                onClick={() => setShowCreateWorkerReq(true)}
                className="text-sm flex items-center bg-emerald-600 text-white hover:bg-emerald-700 px-3.5 py-2 rounded-md font-medium transition-colors shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Post Worker Req
              </button>
              <button
                onClick={() => setShowCreateMaterialReq(true)}
                className="text-sm flex items-center bg-primary text-white hover:bg-primary/90 px-3.5 py-2 rounded-md font-medium transition-colors shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Request Material
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Assigned Site Managers Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center text-lg">
                <UserCheck className="w-5 h-5 mr-2 text-primary" />
                Assigned Site Managers ({siteManagers.length})
              </CardTitle>
              {user?.role === "company_admin" && (
                <button
                  onClick={() => setShowAssignManager(true)}
                  className="text-xs flex items-center bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Manager
                </button>
              )}
            </CardHeader>
            <CardContent>
              {siteManagers.length === 0 ? (
                <div className="text-sm text-slate-500 bg-slate-50 p-4 rounded-md border border-slate-100 flex justify-between items-center">
                  <span>No site manager assigned to this project yet.</span>
                  {user?.role === "company_admin" && (
                    <Button size="sm" variant="outline" onClick={() => setShowAssignManager(true)}>
                      Assign Now
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {siteManagers.map((sm: any) => (
                    <div key={sm.assignment_id || sm.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-800 text-sm">{sm.name || "Site Manager"}</p>
                        {sm.email && (
                          <p className="text-xs text-slate-500 flex items-center">
                            <Mail className="w-3 h-3 mr-1 text-slate-400" /> {sm.email}
                          </p>
                        )}
                        {sm.phone && (
                          <p className="text-xs text-slate-500 flex items-center">
                            <Phone className="w-3 h-3 mr-1 text-slate-400" /> {sm.phone}
                          </p>
                        )}
                      </div>
                      {user?.role === "company_admin" && (
                        <button
                          onClick={() => handleRemoveSiteManager(sm.id || sm.user_id)}
                          className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                          title="Remove Site Manager"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Master Plans */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center text-lg">
                <FileText className="w-5 h-5 mr-2 text-primary" />
                Master Plans
              </CardTitle>
              {user?.role === "company_admin" && (
                <button
                  onClick={() => setShowUploadPlan(true)}
                  className="text-xs flex items-center bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3 mr-1" /> Upload New Version
                </button>
              )}
            </CardHeader>
            <CardContent>
              {masterPlans.length === 0 ? (
                <div className="text-sm text-slate-500 bg-slate-50 p-4 rounded-md border border-slate-100">
                  No master plans uploaded yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {masterPlans.map((plan: any) => {
                    const version = plan.master_plan_versions?.[0]
                    return (
                      <div key={plan.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-md border border-slate-100 hover:border-slate-300 transition-colors">
                        <div>
                          <p className="font-medium text-slate-800">{version?.note || "Master Plan blueprint"}</p>
                          <p className="text-xs text-slate-500">
                            Version {version?.version_number || 1} • Uploaded {new Date(plan.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{plan.status}</Badge>
                          {version && (
                            <button
                              onClick={() => handleDownloadPlan(plan.id, version.id)}
                              className="p-1.5 text-slate-500 hover:text-primary hover:bg-white rounded border border-slate-200 cursor-pointer"
                              title="Download Signed Copy"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Worker Requirements */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center text-lg">
                <Users className="w-5 h-5 mr-2 text-emerald-600" />
                Worker Requirements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workerReqs.length === 0 ? (
                <div className="text-sm text-slate-500 bg-slate-50 p-4 rounded-md border border-slate-100">
                  No worker requirements posted yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {workerReqs.map((req: any) => (
                    <div
                      key={req.id}
                      onClick={() => setSelectedReqId(req.id)}
                      className="flex justify-between items-center p-3 bg-slate-50 rounded-md border border-slate-100 hover:bg-slate-100/80 cursor-pointer transition-colors"
                    >
                      <div>
                        <p className="font-medium text-slate-800">{req.trade} ({req.headcount} needed)</p>
                        <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{req.work_type} • Date: {new Date(req.date).toLocaleDateString()}</span>
                          <span className="flex items-center text-slate-600 font-medium">
                            <Clock className="w-3 h-3 mr-1 text-slate-400" />
                            {req.working_hours || "Standard"} ({req.duration || "1 day"})
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={req.status === "open" ? "default" : req.status === "filled" ? "success" : "secondary"}>
                          {req.status}
                        </Badge>
                        <ExternalLink className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Material Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Package className="w-5 h-5 mr-2 text-orange-500" />
                Material Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {materialReqs.length === 0 ? (
                <div className="text-sm text-slate-500 bg-slate-50 p-4 rounded-md border border-slate-100">
                  No material requests made yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {materialReqs.map((req: any) => (
                    <div
                      key={req.id}
                      onClick={() => setSelectedMatReqId(req.id)}
                      className="flex justify-between items-center p-3 bg-slate-50 rounded-md border border-slate-100 hover:bg-slate-100/80 cursor-pointer transition-colors"
                    >
                      <div>
                        <p className="font-medium text-slate-800">{req.material} - {req.quantity} {req.unit}</p>
                        <p className="text-xs text-slate-500">Required by {new Date(req.required_by_date).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{req.status}</Badge>
                        <ExternalLink className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      {showUploadPlan && (
        <UploadMasterPlanModal
          projectId={projectId}
          onClose={() => setShowUploadPlan(false)}
          onSuccess={() => {
            setShowUploadPlan(false)
            fetchProjectData()
          }}
        />
      )}

      {showAssignManager && (
        <AssignSiteManagerModal
          projectId={projectId}
          onClose={() => setShowAssignManager(false)}
          onSuccess={() => {
            setShowAssignManager(false)
            fetchProjectData()
          }}
        />
      )}

      {showCreateWorkerReq && (
        <CreateWorkerRequirementModal
          projectId={projectId}
          onClose={() => setShowCreateWorkerReq(false)}
          onSuccess={fetchProjectData}
        />
      )}

      {showCreateMaterialReq && (
        <CreateMaterialRequestModal
          projectId={projectId}
          onClose={() => setShowCreateMaterialReq(false)}
          onSuccess={fetchProjectData}
        />
      )}

      {selectedReqId && (
        <RequirementDetailsModal
          requirementId={selectedReqId}
          onClose={() => setSelectedReqId(null)}
        />
      )}

      {selectedMatReqId && (
        <MaterialRequestDetailsModal
          requestId={selectedMatReqId}
          onClose={() => setSelectedMatReqId(null)}
          onUpdate={fetchProjectData}
          onCompareQuotes={(reqId) => setCompareMatReqId(reqId)}
        />
      )}

      {compareMatReqId && (
        <CompareQuotesModal
          materialRequestId={compareMatReqId}
          onClose={() => setCompareMatReqId(null)}
        />
      )}
    </div>
  )
}
