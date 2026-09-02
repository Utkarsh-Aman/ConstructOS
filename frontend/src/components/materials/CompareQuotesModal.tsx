"use client"

import { useEffect, useState } from "react"
import { materialRequestsApi } from "@/lib/api"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { X, Check, Award, Loader2, CheckCircle2 } from "lucide-react"

interface CompareQuotesModalProps {
  materialRequestId: string
  onClose: () => void
  onAccepted?: () => void
}

export function CompareQuotesModal({ materialRequestId, onClose, onAccepted }: CompareQuotesModalProps) {
  const [comparison, setComparison] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [acceptingQuoteId, setAcceptingQuoteId] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState("")
  const [errorMsg, setErrorMsg] = useState("")

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

  const handleAcceptQuote = async (quoteId: string) => {
    try {
      setAcceptingQuoteId(quoteId)
      setErrorMsg("")
      const res = await materialRequestsApi.acceptQuote(materialRequestId, quoteId)
      setSuccessMsg(res.data.message || "Vendor quotation accepted! A delivery shipment has been scheduled.")
      await fetchComparison()
      if (onAccepted) {
        onAccepted()
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to accept quote.")
    } finally {
      setAcceptingQuoteId(null)
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
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {successMsg && (
          <div className="m-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl flex items-center shadow-xs">
            <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="m-4 p-3.5 bg-red-50 border border-red-200 text-red-800 text-sm rounded-xl flex items-center shadow-xs">
            <X className="w-4 h-4 mr-2 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-slate-500">Comparing vendor quotes...</div>
        ) : (!comparison || !comparison.quotes || comparison.quotes.length === 0) ? (
          <div className="p-8 text-center text-slate-500">
            No active vendor quotes submitted for this RFP yet.
          </div>
        ) : (
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {comparison.quotes.map((quote: any) => {
                const isAccepted = quote.status === "accepted"
                const isRejected = quote.status === "rejected"
                const isPending = quote.status === "submitted"
                const isProcessing = acceptingQuoteId === quote.id

                return (
                  <div 
                    key={quote.id} 
                    className={`border rounded-xl p-5 bg-white shadow-xs flex flex-col justify-between space-y-4 transition-all ${
                      isAccepted ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/10" : "border-slate-200 hover:border-primary"
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-lg text-slate-800">{quote.vendors?.business_name || "Vendor"}</h3>
                          {quote.vendors?.phone && (
                            <p className="text-xs text-slate-400">Ph: {quote.vendors.phone}</p>
                          )}
                        </div>
                        <Badge 
                          variant={isAccepted ? "success" : isRejected ? "default" : "default"}
                          className={`capitalize text-xs font-semibold ${
                            isAccepted ? "bg-emerald-100 text-emerald-800" : isRejected ? "bg-slate-100 text-slate-500" : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {quote.status}
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold text-slate-900 mt-2">
                        ₹{Number(quote.total_amount || 0).toLocaleString("en-IN")}
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
                        <span className="font-medium text-slate-700">{quote.delivery_timeline_days || 3} days</span>
                      </div>
                      {(quote.terms_and_conditions || quote.payment_terms) && (
                        <div className="pt-2 border-t border-slate-200/60">
                          <span className="text-slate-400 block mb-0.5">Terms:</span>
                          <p className="text-slate-600 line-clamp-2">{quote.terms_and_conditions || quote.payment_terms}</p>
                        </div>
                      )}
                    </div>

                    {quote.quote_items && quote.quote_items.length > 0 && (
                      <div className="text-xs space-y-1">
                        <span className="font-semibold text-slate-500 uppercase tracking-wider block text-[10px]">Line Items</span>
                        {quote.quote_items.map((item: any) => (
                          <div key={item.id} className="flex justify-between text-slate-600">
                            <span>{item.item} ({item.quantity} {item.unit})</span>
                            <span className="font-medium">₹{item.unit_price}/unit</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div>
                      {isAccepted ? (
                        <div className="w-full py-2 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-1.5">
                          <Check className="w-4 h-4" /> Quote Accepted & Shipment Booked
                        </div>
                      ) : (
                        <Button 
                          className="w-full mt-2 cursor-pointer bg-primary hover:bg-primary/90 text-white" 
                          size="sm"
                          disabled={isProcessing || !isPending}
                          onClick={() => handleAcceptQuote(quote.id)}
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Accepting Quote...
                            </>
                          ) : (
                            "Select Vendor (Accept Quote)"
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <Button variant="outline" onClick={onClose} className="cursor-pointer">Close</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
