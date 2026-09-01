"use client"

import { useEffect, useState } from "react"
import { workerRequirementsApi } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { HardHat, Calendar, Briefcase, Clock } from "lucide-react"
import { LocationLink } from "@/components/ui/LocationLink"

export default function MyWorkPage() {
  const [work, setWork] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMyWork()
  }, [])

  const fetchMyWork = async () => {
    try {
      setLoading(true)
      const res = await workerRequirementsApi.getMyWork()
      setWork(res.data || [])
    } catch (error) {
      console.error("Failed to load my work", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8 text-slate-500">Loading your assigned work...</div>
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">My Work Assignments</h1>
          <p className="text-slate-500 mt-1">View your current assignments, schedule, and shift timings.</p>
        </div>
      </div>

      {work.length === 0 ? (
        <div className="text-center p-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
          <HardHat className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-700">No active work assignments</h3>
          <p className="text-slate-500 mt-2">You haven't been assigned to any project shifts yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {work.map((req) => (
            <Card key={req.id} className="flex flex-col border-emerald-200/60 shadow-sm">
              <CardContent className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-slate-800">{req.trade}</h3>
                    <div className="flex items-center text-sm text-slate-500 mt-1">
                      <Briefcase className="w-4 h-4 mr-1 text-slate-400" />
                      {req.projects?.name || "Project"}
                    </div>
                  </div>
                  <Badge variant="success">Assigned</Badge>
                </div>
                
                <div className="space-y-2.5 text-sm text-slate-600 mb-6 flex-1 bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Location</span>
                    <LocationLink location={req.location} className="max-w-[170px] text-xs" />
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                    <div className="flex items-center text-slate-500">
                      <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                      Assignment Date
                    </div>
                    <span className="font-medium text-slate-800">{new Date(req.date).toLocaleDateString()}</span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                    <div className="flex items-center text-slate-500">
                      <Clock className="w-4 h-4 mr-2 text-slate-400" />
                      Work Shift Timing
                    </div>
                    <span className="font-medium text-slate-800 text-xs">
                      {req.working_hours || "Standard Hours"} ({req.duration || "1 day"})
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                    <span className="text-slate-500 font-medium">Pay Rate</span>
                    <span className="font-bold text-slate-800">₹{req.pay} / {req.pay_basis?.replace("_", " ")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
