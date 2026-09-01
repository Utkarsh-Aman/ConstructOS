"use client"

import { useState } from "react"
import { projectsApi } from "@/lib/api"
import { X, UploadCloud, Loader2 } from "lucide-react"

export default function UploadMasterPlanModal({ projectId, onClose, onSuccess }: { projectId: string, onClose: () => void, onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError("Please select a file to upload.")
      return
    }

    try {
      setLoading(true)
      setError("")
      
      const formData = new FormData()
      formData.append("file", file)
      if (note) formData.append("note", note)
      
      await projectsApi.uploadMasterPlan(projectId, formData)
      onSuccess()
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to upload master plan. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden relative">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-xl font-semibold text-slate-800 flex items-center">
            <UploadCloud className="w-5 h-5 mr-2 text-primary" />
            Upload Master Plan
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-100">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Select File (PDF, CAD, Image) <span className="text-red-500">*</span></label>
            <input
              type="file"
              required
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
            />
            <p className="text-xs text-slate-500 mt-2">Max file size: 100MB</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Note / Description (Optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              rows={3}
              placeholder="e.g. Initial draft for foundation phase"
            />
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
              disabled={loading || !file}
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors flex items-center disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {loading ? "Uploading..." : "Upload Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
