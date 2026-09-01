"use client"

import { useEffect, useState } from "react"
import { materialRequestsApi } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { X, Package, Calendar, Tag, ArrowRight, FileText, CheckCircle } from "lucide-react"

interface MaterialRequestDetailsModalProps {
  requestId: string
  onClose: () => void
  onUpdate?: () => void
  onCompareQuotes?: (reqId: string) => void
}

export function MaterialRequestDetailsModal({
  requestId,
  onClose,
  onUpdate,
  onCompareQuotes,
}: MaterialRequestDetailsModalProps) {
  const { user } = useAuth()
  const [request, setRequest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (requestId) {
      fetchDetails()
    }
  }, [requestId])

  const fetchDetails = async () => {
    try {
      setLoading(true)
      const res = await materialRequestsApi.getById(requestId)
      setRequest(res.data)
    } catch (err) {
      console.error("Failed to load material request details", err)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusTransition = async (nextStatus: string) => {
    try {
      setActionLoading(true)
      setError("")
      await materialRequestsApi.updateStatus(requestId, nextStatus)
      await fetchDetails()
      if (onUpdate) onUpdate()
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to update status")
    } finally {
      setActionLoading(false)
    }
  }

  const handleOpenRfp = async () => {
    try {
      setActionLoading(true)
      setError("")
      await materialRequestsApi.openRfp(requestId)
      await fetchDetails()
      if (onUpdate) onUpdate()
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to open RFP")
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{request?.material || "Material Request"}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Project: {request?.projects?.name || "N/A"}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading details...</div>
        ) : !request ? (
          <div className="p-8 text-center text-slate-500">Request not found</div>
        ) : (
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
                {error}
              </div>
            )}

            {/* Status lifecycle banner */}
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border border-slate-100">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Current Status</span>
                <Badge variant="outline" className="mt-1 font-semibold text-sm">
                  {request.status}
                </Badge>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Priority</span>
                <span className="text-sm font-semibold capitalize text-slate-700 mt-0.5 block">
                  {request.priority}
                </span>
              </div>
            </div>

            {/* Specs */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Quantity Required:</span>
                <span className="font-bold text-slate-800">{request.quantity} {request.unit}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200/60">
                <span className="text-slate-500">Required By Date:</span>
                <span className="font-bold text-slate-800">{new Date(request.required_by_date).toLocaleDateString()}</span>
              </div>
              {request.remarks && (
                <div className="pt-2 border-t border-slate-200/60">
                  <span className="text-slate-500 block mb-1">Remarks:</span>
                  <p className="text-slate-700 bg-white p-2.5 rounded border border-slate-200 text-xs">{request.remarks}</p>
                </div>
              )}
            </div>

            {/* RFPs & Quotes section */}
            {request.rfps && request.rfps.length > 0 && (
              <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-orange-800 uppercase tracking-wider flex items-center">
                    <FileText className="w-4 h-4 mr-1 text-orange-600" />
                    Open RFP Active
                  </span>
                  <Badge variant="default" className="bg-orange-600">
                    {request.rfps[0].status}
                  </Badge>
                </div>
                {onCompareQuotes && (
                  <Button 
                    size="sm" 
                    className="w-full mt-2 bg-orange-600 hover:bg-orange-700 text-white"
                    onClick={() => {
                      onClose()
                      onCompareQuotes(requestId)
                    }}
                  >
                    Compare Submitted Quotes
                  </Button>
                )}
              </div>
            )}

            {/* Actions for Company Admin / Site Manager */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Workflow Transitions</h4>
              
              <div className="flex flex-wrap gap-2">
                {user?.role === "site_manager" && request.status === "draft" && (
                  <Button 
                    size="sm" 
                    disabled={actionLoading} 
                    onClick={() => handleStatusTransition("submitted")}
                  >
                    Submit for Review
                  </Button>
                )}

                {user?.role === "company_admin" && (
                  <>
                    {request.status === "draft" && (
                      <Button size="sm" disabled={actionLoading} onClick={() => handleStatusTransition("submitted")}>
                        Submit
                      </Button>
                    )}
                    {request.status === "submitted" && (
                      <Button size="sm" disabled={actionLoading} onClick={() => handleStatusTransition("under_review")}>
                        Mark Under Review
                      </Button>
                    )}
                    {request.status === "under_review" && (
                      <>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={actionLoading} onClick={() => handleStatusTransition("approved")}>
                          Approve Request
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" disabled={actionLoading} onClick={() => handleStatusTransition("rejected")}>
                          Reject
                        </Button>
                      </>
                    )}
                    {request.status === "approved" && (!request.rfps || request.rfps.length === 0) && (
                      <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white" disabled={actionLoading} onClick={handleOpenRfp}>
                        Open RFP to Vendors
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
