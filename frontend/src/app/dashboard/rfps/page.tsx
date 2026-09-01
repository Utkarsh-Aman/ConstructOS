"use client"

import { useEffect, useState } from "react"
import { vendorsApi } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { FileText, Calendar, Package } from "lucide-react"
import { SubmitQuoteModal } from "@/components/vendors/SubmitQuoteModal"

export default function VendorRfpsPage() {
  const [rfps, setRfps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRfp, setSelectedRfp] = useState<any>(null)

  useEffect(() => {
    fetchRfps()
  }, [])

  const fetchRfps = async () => {
    try {
      setLoading(true)
      const res = await vendorsApi.getOpenRfps()
      setRfps(res.data || [])
    } catch (error) {
      console.error("Failed to load RFPs", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8 text-slate-500">Loading open RFPs...</div>
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Open RFPs</h1>
          <p className="text-slate-500 mt-1">Browse requests for proposals and submit your quotes.</p>
        </div>
      </div>

      {rfps.length === 0 ? (
        <div className="text-center p-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
          <FileText className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-700">No open RFPs</h3>
          <p className="text-slate-500 mt-2">There are currently no new Requests For Proposals available.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {rfps.map((rfp) => (
            <Card key={rfp.id} className="flex flex-col">
              <CardContent className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center">
                    <FileText className="w-6 h-6 text-primary mr-3" />
                    <h3 className="font-bold text-xl text-slate-800">RFP #{rfp.id.substring(0, 8)}</h3>
                  </div>
                </div>
                
                <div className="space-y-4 mb-6 flex-1">
                  <p className="text-sm text-slate-600 font-medium">Requested Items:</p>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-3">
                    {rfp.material_requests && (
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center text-slate-700 font-medium">
                          <Package className="w-4 h-4 mr-2 text-slate-400" />
                          {rfp.material_requests.material}
                        </div>
                        <span className="font-bold text-slate-800 bg-white px-2 py-1 rounded border border-slate-200">
                          {rfp.material_requests.quantity} {rfp.material_requests.unit}
                        </span>
                      </div>
                    )}
                    
                    {rfp.material_requests?.required_by_date && (
                      <div className="flex items-center text-sm text-slate-500 pt-3 border-t border-slate-200/60">
                        <Calendar className="w-4 h-4 mr-2" />
                        Required by: <span className="text-slate-700 font-medium ml-1">{new Date(rfp.material_requests.required_by_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-auto">
                  <Button className="w-full" size="lg" onClick={() => setSelectedRfp(rfp)}>
                    Submit Quote
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedRfp && (
        <SubmitQuoteModal
          rfp={selectedRfp}
          onClose={() => setSelectedRfp(null)}
          onSuccess={fetchRfps}
        />
      )}
    </div>
  )
}
