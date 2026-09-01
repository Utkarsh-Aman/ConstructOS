"use client"

import { useState } from "react"
import { projectsApi } from "@/lib/api"
import { X, UserPlus, Loader2 } from "lucide-react"

export default function AssignSiteManagerModal({ projectId, onClose, onSuccess }: { projectId: string, onClose: () => void, onSuccess: () => void }) {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setError("Please enter an email address.")
      return
    }

    try {
      setLoading(true)
      setError("")
      
      await projectsApi.assignSiteManager(projectId, email)
      onSuccess()
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to assign site manager. Ensure they are registered with the 'site_manager' role.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden relative">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-xl font-semibold text-slate-800 flex items-center">
            <UserPlus className="w-5 h-5 mr-2 text-primary" />
            Assign Site Manager
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-100">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Site Manager Email <span className="text-red-500">*</span></label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="manager@example.com"
            />
            <p className="text-xs text-slate-500 mt-2">The user must already be registered with a site manager account.</p>
          </div>

          <div className="flex justify-end pt-4 gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !email}
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors flex items-center disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {loading ? "Assigning..." : "Assign Manager"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
