"use client"

import { useEffect, useState } from "react"
import { workerRequirementsApi } from "@/lib/api"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { X, Users, Calendar, Clock, DollarSign, UserCheck } from "lucide-react"
import { LocationLink } from "@/components/ui/LocationLink"

interface RequirementDetailsModalProps {
  requirementId: string
  onClose: () => void
}

export function RequirementDetailsModal({ requirementId, onClose }: RequirementDetailsModalProps) {
  const [details, setDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (requirementId) {
      fetchDetails()
    }
  }, [requirementId])

  const fetchDetails = async () => {
    try {
      setLoading(true)
      const res = await workerRequirementsApi.getById(requirementId)
      setDetails(res.data)
    } catch (err) {
      console.error("Failed to load requirement details", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-xl w-full overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{details?.trade || "Requirement Details"}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{details?.work_type}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading requirement breakdown...</div>
        ) : !details ? (
          <div className="p-8 text-center text-slate-500">Requirement not found</div>
        ) : (
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {/* Header badges & headcount */}
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border border-slate-100">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Fulfillment Status</span>
                <Badge variant={
                  details.status === "open" ? "success" :
                  details.status === "filled" ? "default" : "secondary"
                } className="mt-1">
                  {details.status?.replace("_", " ")}
                </Badge>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Headcount</span>
                <p className="text-lg font-bold text-slate-800 mt-0.5">
                  <span className="text-emerald-600">{details.accepted_count || 0}</span> / {details.headcount} filled
                </p>
              </div>
            </div>

            {/* Main Specs */}
            <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 bg-slate-50 p-4 rounded-lg border border-slate-100">
              <div>
                <span className="text-xs text-slate-400 uppercase font-semibold block">Site Location</span>
                <LocationLink location={details.location} className="mt-1" />
              </div>
              <div>
                <span className="text-xs text-slate-400 uppercase font-semibold block">Start Date</span>
                <span className="font-semibold text-slate-800 block mt-1">{new Date(details.date).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 uppercase font-semibold block">Working Hours & Duration</span>
                <span className="font-semibold text-slate-800 block mt-1">
                  {details.working_hours || "Standard Hours"} ({details.duration || "1 day"})
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 uppercase font-semibold block">Pay Rate</span>
                <span className="font-bold text-slate-800 block mt-1">₹{details.pay} / {details.pay_basis?.replace("_", " ")}</span>
              </div>
            </div>

            {details.description && (
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Description & Requirements</h4>
                <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">{details.description}</p>
              </div>
            )}

            {/* Applicant Responses Section */}
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center">
                <UserCheck className="w-4 h-4 mr-1 text-primary" />
                Worker Responses ({details.responses?.length || 0})
              </h4>
              {(!details.responses || details.responses.length === 0) ? (
                <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
                  No responses received yet for this requirement.
                </div>
              ) : (
                <div className="space-y-2">
                  {details.responses.map((resp: any) => (
                    <div key={resp.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm">
                      <div>
                        <p className="font-semibold text-slate-800">{resp.users?.name || "Worker"} ({resp.users?.phone || "No phone"})</p>
                        <p className="text-xs text-slate-500">
                          Type: <span className="capitalize">{resp.type}</span> 
                          {resp.type === "group" && ` • Committed: ${resp.committed_count}`}
                        </p>
                      </div>
                      <Badge variant={resp.status === "accepted" ? "success" : "secondary"}>
                        {resp.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
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
