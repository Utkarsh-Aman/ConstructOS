"use client"

import { useState } from "react"
import { workerRequirementsApi } from "@/lib/api"
import { Button } from "@/components/ui/Button"
import { X } from "lucide-react"

interface CreateWorkerRequirementModalProps {
  projectId?: string
  projects?: { id: string; name: string }[]
  onClose: () => void
  onSuccess: () => void
}

export function CreateWorkerRequirementModal({
  projectId: initialProjectId,
  projects = [],
  onClose,
  onSuccess,
}: CreateWorkerRequirementModalProps) {
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId || (projects[0]?.id || ""))
  const [trade, setTrade] = useState("")
  const [workType, setWorkType] = useState("Construction")
  const [headcount, setHeadcount] = useState(1)
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [duration, setDuration] = useState("1 day")
  const [workingHours, setWorkingHours] = useState("8 AM - 5 PM")
  const [location, setLocation] = useState("")
  const [pay, setPay] = useState(800)
  const [payBasis, setPayBasis] = useState("per_day")
  const [description, setDescription] = useState("")
  const [requiredSkills, setRequiredSkills] = useState("")
  const [urgentFlag, setUrgentFlag] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProjectId) {
      setError("Please select a project")
      return
    }
    setError("")
    setLoading(true)

    try {
      await workerRequirementsApi.create(selectedProjectId, {
        trade,
        work_type: workType,
        headcount: Number(headcount),
        date,
        duration,
        working_hours: workingHours,
        location,
        pay: Number(pay),
        pay_basis: payBasis,
        description,
        required_skills: requiredSkills.split(",").map(s => s.trim()).filter(Boolean),
        urgent_flag: urgentFlag,
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to create worker requirement")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Post Worker Requirement</h2>
            <p className="text-xs text-slate-500 mt-0.5">Role: Site Manager / Project Overseer</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
              {error}
            </div>
          )}

          {!initialProjectId && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Select Project *</label>
              <select
                required
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-white"
              >
                <option value="">-- Choose Project --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Trade Required *</label>
              <input
                type="text"
                required
                placeholder="e.g. Mason, Welder"
                value={trade}
                onChange={(e) => setTrade(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Work Type</label>
              <input
                type="text"
                required
                placeholder="e.g. Structural, Civil"
                value={workType}
                onChange={(e) => setWorkType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Headcount Needed *</label>
              <input
                type="number"
                min="1"
                required
                value={headcount}
                onChange={(e) => setHeadcount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Duration</label>
              <input
                type="text"
                placeholder="e.g. 5 days, 2 weeks"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Working Hours</label>
              <input
                type="text"
                placeholder="e.g. 8 AM - 5 PM"
                value={workingHours}
                onChange={(e) => setWorkingHours(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Site Location *</label>
            <input
              type="text"
              required
              placeholder="e.g. Block B, Gate 3, IIT Campus"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Pay Amount (₹) *</label>
              <input
                type="number"
                min="0"
                step="50"
                required
                value={pay}
                onChange={(e) => setPay(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Pay Basis</label>
              <select
                value={payBasis}
                onChange={(e) => setPayBasis(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-white"
              >
                <option value="per_day">Per Day</option>
                <option value="per_job">Per Job</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Required Skills (Comma-separated)</label>
            <input
              type="text"
              placeholder="e.g. Scaffolding, Blueprint reading, Safety cert"
              value={requiredSkills}
              onChange={(e) => setRequiredSkills(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Description / Notes</label>
            <textarea
              rows={2}
              placeholder="Specific instructions or tools provided..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="urgentFlag"
              checked={urgentFlag}
              onChange={(e) => setUrgentFlag(e.target.checked)}
              className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
            />
            <label htmlFor="urgentFlag" className="text-sm font-medium text-amber-700">
              Mark as Urgent Requirement
            </label>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Publishing..." : "Publish Requirement"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
