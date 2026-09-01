"use client"

import { useEffect, useState } from "react"
import { workerRequirementsApi } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { HardHat, Calendar, Users, Briefcase, CheckCircle2, Clock } from "lucide-react"
import { LocationLink } from "@/components/ui/LocationLink"

export default function AvailableWorkPage() {
  const { user } = useAuth()
  const [requirements, setRequirements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [appliedIds, setAppliedIds] = useState<Record<string, boolean>>({})
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    fetchRequirements()
  }, [])

  const fetchRequirements = async () => {
    try {
      setLoading(true)
      const res = await workerRequirementsApi.getAll()
      setRequirements(res.data || [])
    } catch (error) {
      console.error("Failed to load available work", error)
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async (req: any) => {
    try {
      setActionLoading(req.id)
      setErrorMsg("")
      if (user?.role === "group_leader") {
        const countStr = prompt(`How many workers are you committing for ${req.trade}?`, "5")
        if (!countStr) {
          setActionLoading(null)
          return
        }
        const committed_count = parseInt(countStr, 10)
        await workerRequirementsApi.submitResponse(req.id, {
          type: "group",
          committed_count,
        })
      } else {
        await workerRequirementsApi.submitResponse(req.id, {
          type: "individual",
        })
      }
      setAppliedIds(prev => ({ ...prev, [req.id]: true }))
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to submit application")
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8 text-slate-500">Loading available work...</div>
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Available Work</h1>
          <p className="text-slate-500 mt-1">Find open requirements and apply for work in your trade.</p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
          {errorMsg}
        </div>
      )}

      {requirements.length === 0 ? (
        <div className="text-center p-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
          <HardHat className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-700">No work available right now</h3>
          <p className="text-slate-500 mt-2">Check back later for new opportunities.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {requirements.map((req) => {
            const isApplied = appliedIds[req.id]
            return (
              <Card key={req.id} className="flex flex-col hover:border-slate-300 transition-colors">
                <CardContent className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-slate-800">{req.trade}</h3>
                      <div className="flex items-center text-sm text-slate-500 mt-1">
                        <Briefcase className="w-4 h-4 mr-1 text-slate-400" />
                        {req.projects?.name || "Project"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg text-slate-800">₹{req.pay}</div>
                      <div className="text-xs text-slate-500 capitalize">per {req.pay_basis?.replace("_", " ")}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2.5 text-sm text-slate-600 mb-6 flex-1 bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center text-slate-500">
                        <Users className="w-4 h-4 mr-2 text-slate-400" />
                        Headcount Needed
                      </div>
                      <span className="font-semibold text-slate-800">{req.headcount} workers</span>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                      <span className="text-slate-500">Location</span>
                      <LocationLink location={req.location} className="max-w-[170px] text-xs" />
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                      <div className="flex items-center text-slate-500">
                        <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                        Start Date
                      </div>
                      <span className="font-medium text-slate-800">{new Date(req.date).toLocaleDateString()}</span>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                      <div className="flex items-center text-slate-500">
                        <Clock className="w-4 h-4 mr-2 text-slate-400" />
                        Work Timing
                      </div>
                      <span className="font-medium text-slate-800 text-xs">
                        {req.working_hours || "Standard Hours"} ({req.duration || "1 day"})
                      </span>
                    </div>
                  </div>

                  <div className="mt-auto">
                    {isApplied ? (
                      <div className="flex items-center justify-center p-2.5 text-sm font-semibold text-emerald-700 bg-emerald-50 rounded-lg">
                        <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
                        Application Submitted!
                      </div>
                    ) : (
                      <Button
                        className="w-full"
                        disabled={actionLoading === req.id}
                        onClick={() => handleApply(req)}
                      >
                        {actionLoading === req.id
                          ? "Submitting..."
                          : user?.role === "group_leader"
                          ? "Submit Group Response"
                          : "Apply Now"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
