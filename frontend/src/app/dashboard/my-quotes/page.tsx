"use client"

import { useEffect, useState } from "react"
import { vendorsApi } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { FileText, IndianRupee } from "lucide-react"

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
    return <div className="flex justify-center p-8 text-slate-500">Loading your quotes...</div>
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">My Quotes</h1>
          <p className="text-slate-500 mt-1">Track the status of your submitted quotes.</p>
        </div>
      </div>

      {quotes.length === 0 ? (
        <div className="text-center p-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
          <FileText className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-700">No quotes submitted</h3>
          <p className="text-slate-500 mt-2">You haven't submitted any quotes yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quotes.map((quote) => (
            <Card key={quote.id} className="flex flex-col">
              <CardContent className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center">
                      <IndianRupee className="w-5 h-5 text-primary mr-1" />
                      <h3 className="font-bold text-xl text-slate-800">{quote.total_amount?.toLocaleString("en-IN")}</h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">RFP: {quote.rfps?.material_requests?.material || "Material"}</p>
                  </div>
                  <Badge variant={
                    quote.status === "accepted" ? "success" : 
                    quote.status === "rejected" ? "danger" : 
                    quote.status === "withdrawn" ? "secondary" : "default"
                  }>
                    {quote.status?.replace("_", " ")}
                  </Badge>
                </div>
                
                <div className="space-y-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4 flex-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Validity</span>
                    <span className="font-medium text-slate-800">{quote.validity_period_days} days</span>
                  </div>
                  {quote.delivery_timeline_days && (
                    <div className="flex justify-between pt-2 border-t border-slate-200/60">
                      <span className="text-slate-500">Delivery</span>
                      <span className="font-medium text-slate-800">{quote.delivery_timeline_days} days</span>
                    </div>
                  )}
                </div>

                {quote.status === "submitted" && (
                  <div className="mt-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-red-600 border-red-200 hover:bg-red-50"
                      disabled={actionLoading === quote.id}
                      onClick={() => handleWithdraw(quote)}
                    >
                      {actionLoading === quote.id ? "Withdrawing..." : "Withdraw Quote"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
