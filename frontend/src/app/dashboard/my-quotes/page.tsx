"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { vendorsApi } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { FileText, IndianRupee, Building2, MapPin, CheckCircle2, Clock, Truck, ArrowRight, Loader2 } from "lucide-react"

export default function MyQuotesPage() {
  const [quotes, setQuotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchMyQuotes()
  }, [])

  const fetchMyQuotes = async () => {
    try {
      setLoading(true)
      const res = await vendorsApi.getMyQuotes()
      setQuotes(res.data || [])
    } catch (error) {
      console.error("Failed to load quotes", error)
    } finally {
      setLoading(false)
    }
  }

  const handleWithdraw = async (quote: any) => {
    if (!confirm("Are you sure you want to withdraw this quote?")) return
    try {
      setActionLoading(quote.id)
      await vendorsApi.withdrawQuote(quote.rfp_id, quote.id)
      fetchMyQuotes()
    } catch (err) {
      console.error("Failed to withdraw quote", err)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center p-8 text-slate-500">
        <p className="text-sm">Loading your submitted quotations...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 pb-3 sm:pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800">My Quotations</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Track real-time acceptance status of your bids and manage deliveries.</p>
        </div>

        <Link href="/dashboard/rfps">
          <Button size="sm" className="text-xs flex items-center gap-1.5 shadow-xs cursor-pointer">
            Browse New Demands <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>

      {quotes.length === 0 ? (
        <div className="text-center p-10 sm:p-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
          <FileText className="mx-auto h-10 w-10 text-slate-300 mb-3" />
          <h3 className="text-base font-semibold text-slate-700">No quotes submitted yet</h3>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-md mx-auto">
            You haven't submitted any quotations. Explore open material demands from construction companies to start bidding.
          </p>
          <Link href="/dashboard/rfps" className="inline-block mt-4">
            <Button size="sm" className="cursor-pointer">Browse Material Demands</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {quotes.map((quote) => {
            const mr = quote.rfps?.material_requests || {}
            const proj = mr.projects || {}
            const comp = proj.companies || {}
            const isAccepted = quote.status === "accepted"
            const isRejected = quote.status === "rejected"
            const isWithdrawn = quote.status === "withdrawn"

            return (
              <Card 
                key={quote.id} 
                className={`flex flex-col border shadow-xs hover:shadow-md transition-all ${
                  isAccepted ? "border-emerald-400 ring-1 ring-emerald-400/30 bg-emerald-50/10" : "border-slate-200"
                }`}
              >
                <CardContent className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <div>
                        <div className="flex items-center text-slate-900 font-bold text-xl">
                          <IndianRupee className="w-4 h-4 text-primary mr-0.5" />
                          <span>{Number(quote.total_amount || 0).toLocaleString("en-IN")}</span>
                        </div>
                        <p className="text-xs text-slate-500 font-semibold mt-0.5">
                          {mr.material || "Material Item"} ({mr.quantity || 1} {mr.unit || "Units"})
                        </p>
                      </div>

                      <Badge 
                        variant={isAccepted ? "success" : isRejected ? "danger" : isWithdrawn ? "secondary" : "default"}
                        className={`capitalize text-xs font-semibold px-2.5 py-0.5 ${
                          isAccepted ? "bg-emerald-100 text-emerald-800" : isRejected ? "bg-red-100 text-red-800" : isWithdrawn ? "bg-slate-200 text-slate-600" : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {quote.status?.replace("_", " ")}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 mb-3">
                      {comp.name && (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-800 truncate">{comp.name}</span>
                        </div>
                      )}

                      {proj.name && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-slate-600 truncate">{proj.name}</span>
                        </div>
                      )}

                      <div className="flex justify-between pt-1.5 border-t border-slate-200/60">
                        <span className="text-slate-500">Validity:</span>
                        <span className="font-semibold text-slate-700">{quote.validity_period_days} days</span>
                      </div>

                      {quote.delivery_timeline_days && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Lead Time:</span>
                          <span className="font-semibold text-slate-700">{quote.delivery_timeline_days} days</span>
                        </div>
                      )}

                      {(quote.payment_terms || quote.terms_and_conditions) && (
                        <div className="pt-1.5 border-t border-slate-200/60">
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Terms:</span>
                          <p className="text-slate-600 line-clamp-2">{quote.payment_terms || quote.terms_and_conditions}</p>
                        </div>
                      )}
                    </div>

                    {quote.quote_items && quote.quote_items.length > 0 && (
                      <div className="text-xs space-y-1">
                        <span className="font-semibold text-slate-500 uppercase tracking-wider block text-[10px]">Quoted Line Items</span>
                        {quote.quote_items.map((item: any) => (
                          <div key={item.id} className="flex justify-between text-slate-600 text-[11px]">
                            <span className="truncate max-w-[150px]">{item.item} ({item.quantity} {item.unit})</span>
                            <span className="font-semibold">₹{item.unit_price}/unit</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    {isAccepted ? (
                      <Link href="/dashboard/fleet" className="block w-full">
                        <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2.5 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs">
                          <Truck className="w-3.5 h-3.5" /> Manage Shipment & Fleet
                        </Button>
                      </Link>
                    ) : quote.status === "submitted" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-red-600 border-red-200 hover:bg-red-50 text-xs cursor-pointer"
                        disabled={actionLoading === quote.id}
                        onClick={() => handleWithdraw(quote)}
                      >
                        {actionLoading === quote.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Withdrawing...
                          </>
                        ) : (
                          "Withdraw Quote"
                        )}
                      </Button>
                    ) : null}
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
