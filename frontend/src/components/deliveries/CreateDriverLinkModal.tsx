"use client"

import { useState, useEffect } from "react"
import { deliveriesApi, vendorsApi } from "@/lib/api"
import { Button } from "@/components/ui/Button"
import { X, Copy, Check, Share2, User, ExternalLink, Loader2 } from "lucide-react"

interface CreateDriverLinkModalProps {
  deliveryId: string
  onClose: () => void
}

export function CreateDriverLinkModal({ deliveryId, onClose }: CreateDriverLinkModalProps) {
  const [drivers, setDrivers] = useState<any[]>([])
  const [selectedDriverId, setSelectedDriverId] = useState<string>("")
  const [generatedLink, setGeneratedLink] = useState("")
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchDrivers()
  }, [])

  const fetchDrivers = async () => {
    try {
      const res = await vendorsApi.getDrivers()
      const list = res.data || []
      setDrivers(list)
      if (list.length > 0) {
        setSelectedDriverId(list[0].id)
      }
    } catch {
      // ignore
    }
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await deliveriesApi.createDriverLink(deliveryId, selectedDriverId || undefined)
      const token = res.data.link_token
      const fullUrl = `${window.location.origin}/driver-track?delivery_id=${deliveryId}&link_token=${token}`
      setGeneratedLink(fullUrl)
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to generate driver link.")
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`Hi, here is your live GPS tracking dispatch link for the construction material delivery:\n${generatedLink}\n\nPlease click to start transmitting live GPS during transit.`)
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Generate Driver GPS Link</h2>
            <p className="text-xs text-slate-500 mt-0.5">Secure 48-Hour Live Tracking Link</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl">
              {error}
            </div>
          )}

          {!generatedLink ? (
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Assigned Driver
                </label>
                
                {drivers.length > 0 ? (
                  <select
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 text-xs sm:text-sm bg-white"
                  >
                    <option value="">-- Any Available Fleet Driver --</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.contact})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Auto-assigns to fleet dispatch (No specific driver registered yet).</span>
                  </div>
                )}
              </div>

              <div className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                💡 <strong>How it works:</strong> The driver opens this link on their mobile browser and taps &quot;Start Live GPS Broadcast&quot;. <strong>No password, login, or app download required.</strong>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onClose} className="cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={loading} className="cursor-pointer">
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                  Generate Secure Link
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-medium flex items-center">
                <Check className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
                Tracking link generated and active for 48 hours!
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Shareable Driver Web Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedLink}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-xl text-xs text-slate-700 font-mono select-all focus:outline-none"
                  />
                  <Button type="button" size="sm" onClick={handleCopy} className="shrink-0 cursor-pointer">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button 
                  type="button" 
                  onClick={handleWhatsAppShare}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-2.5 cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Share2 className="w-3.5 h-3.5" /> Share on WhatsApp
                </Button>

                <a 
                  href={generatedLink} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="flex-1"
                >
                  <Button variant="outline" className="w-full text-xs py-2.5 cursor-pointer flex items-center justify-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5" /> Open Driver View
                  </Button>
                </a>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <Button size="sm" variant="ghost" onClick={onClose} className="cursor-pointer text-xs">
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
