"use client"

import { useState } from "react"
import { deliveriesApi } from "@/lib/api"
import { Button } from "@/components/ui/Button"
import { X, Link2, Copy, Check } from "lucide-react"

interface CreateDriverLinkModalProps {
  deliveryId: string
  onClose: () => void
}

export function CreateDriverLinkModal({ deliveryId, onClose }: CreateDriverLinkModalProps) {
  const [driverId, setDriverId] = useState("driver-1")
  const [generatedLink, setGeneratedLink] = useState("")
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await deliveriesApi.createDriverLink(deliveryId, driverId)
      const token = res.data.link_token
      const fullUrl = `${window.location.origin}/driver-track?delivery_id=${deliveryId}&link_token=${token}`
      setGeneratedLink(fullUrl)
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to generate driver link")
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Generate Driver GPS Link</h2>
            <p className="text-xs text-slate-500 mt-0.5">Secure 48-Hour One-Time Link</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
              {error}
            </div>
          )}

          {!generatedLink ? (
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Driver Identifier / Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Singh / Driver-01"
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                />
              </div>

              <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                This link allows the driver to broadcast GPS updates for this delivery without logging into a user account.
              </p>

              <div className="pt-2 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Generating..." : "Generate Secure Link"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-sm font-medium flex items-center">
                <Check className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
                Driver tracking link generated successfully!
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Driver Dispatch Link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedLink}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-xs font-mono text-slate-700 focus:outline-none"
                  />
                  <Button onClick={handleCopy} size="sm" className="shrink-0">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button variant="outline" onClick={onClose}>Done</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
