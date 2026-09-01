"use client"

import { useEffect, useState } from "react"
import { materialRequestsApi } from "@/lib/api"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { X, Check, Award } from "lucide-react"

interface CompareQuotesModalProps {
  materialRequestId: string
  onClose: () => void
}

export function CompareQuotesModal({ materialRequestId, onClose }: CompareQuotesModalProps) {
  const [comparison, setComparison] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (materialRequestId) {
      fetchComparison()
    }
  }, [materialRequestId])

  const fetchComparison = async () => {
    try {
      setLoading(true)
      const res = await materialRequestsApi.compareQuotes(materialRequestId)
      setComparison(res.data)
    } catch (err) {
      console.error("Failed to load quotes comparison", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center">
              <Award className="w-5 h-5 mr-2 text-amber-500" />
              Side-by-Side Quote Comparison
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">RFP ID: #{comparison?.rfp_id?.substring(0, 8) || "N/A"}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Comparing vendor quotes...</div>
        ) : (!comparison || !comparison.quotes || comparison.quotes.length === 0) ? (
          <div className="p-8 text-center text-slate-500">
            No active vendor quotes submitted for this RFP yet.
          </div>
        ) : (
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {comparison.quotes.map((quote: any) => (
                <div key={quote.id} className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm flex flex-col justify-between space-y-4 hover:border-primary transition-all">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg text-slate-800">{quote.vendors?.business_name || "Vendor"}</h3>
                      <Badge variant="default">{quote.status}</Badge>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-2">
                      ₹{quote.total_amount?.toLocaleString("en-IN")}
                      <span className="text-xs text-slate-400 font-normal ml-1">({quote.currency || "INR"})</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Validity:</span>
                      <span className="font-medium text-slate-700">{quote.validity_period_days} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Est Delivery:</span>
                      <span className="font-medium text-slate-700">{quote.delivery_timeline_days || "N/A"} days</span>
                    </div>
                    {quote.terms && (
                      <div className="pt-2 border-t border-slate-200/60">
                        <span className="text-slate-400 block mb-0.5">Terms:</span>
                        <p className="text-slate-600 line-clamp-2">{quote.terms}</p>
                      </div>
                    )}
                  </div>

                  {quote.quote_items && quote.quote_items.length > 0 && (
                    <div className="text-xs space-y-1">
                      <span className="font-semibold text-slate-500 uppercase tracking-wider block">Line Items</span>
                      {quote.quote_items.map((item: any) => (
                        <div key={item.id} className="flex justify-between text-slate-600">
                          <span>{item.item} ({item.quantity} {item.unit})</span>
                          <span className="font-medium">₹{item.unit_price}/unit</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button className="w-full mt-2" size="sm">
                    Select Vendor
                  </Button>
                </div>
              ))}
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
