"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { vendorsApi } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { FileText, Calendar, Package, Search, Building2, MapPin, CheckCircle2, ArrowRight, X } from "lucide-react"
import { SubmitQuoteModal } from "@/components/vendors/SubmitQuoteModal"

export default function VendorRfpsPage() {
  const [demands, setDemands] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDemand, setSelectedDemand] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetchDemands()
  }, [])

  const fetchDemands = async () => {
    try {
      setLoading(true)
      const res = await vendorsApi.getOpenRfps()
      setDemands(res.data || [])
    } catch (error) {
      console.error("Failed to load material demands", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredDemands = useMemo(() => {
    if (!searchQuery.trim()) return demands
    const q = searchQuery.toLowerCase().trim()
    return demands.filter((d) => {
      const mat = (d.material || "").toLowerCase()
      const proj = (d.project_name || "").toLowerCase()
      const comp = (d.company_name || "").toLowerCase()
      const loc = (typeof d.project_location === "string" ? d.project_location : d.project_location?.address || d.project_location?.name || "").toLowerCase()
      return mat.includes(q) || proj.includes(q) || comp.includes(q) || loc.includes(q)
    })
  }, [demands, searchQuery])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center p-8 text-slate-500">
        <p className="text-sm">Loading open material demands from construction companies...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 pb-3 sm:pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800">
            Material Demands & RFPs
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Browse live material requests from construction companies across all projects and submit competitive quotes.
          </p>
        </div>

        <Link href="/dashboard/my-quotes">
          <Button variant="outline" size="sm" className="text-xs flex items-center gap-1.5 cursor-pointer">
            <FileText className="w-3.5 h-3.5 text-primary" /> View My Submitted Quotes
          </Button>
        </Link>
      </div>

      {/* Real-time Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            type="text"
            placeholder="Search by material (e.g. Steel, Cement, Tiles), project, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 text-xs sm:text-sm bg-white border-slate-200 focus-visible:ring-primary/40 h-9 sm:h-10 rounded-xl"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {demands.length > 0 && (
          <div className="text-xs text-slate-500 font-medium self-end sm:self-center">
            Showing <span className="font-bold text-slate-700">{filteredDemands.length}</span> of {demands.length} open demands
          </div>
        )}
      </div>

      {demands.length === 0 ? (
        <div className="text-center p-10 sm:p-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
          <Package className="mx-auto h-10 w-10 text-slate-300 mb-3" />
          <h3 className="text-base font-semibold text-slate-700">No open material demands</h3>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-md mx-auto">
            There are currently no active material requests or RFPs posted by companies. Check back soon!
          </p>
        </div>
      ) : filteredDemands.length === 0 ? (
        <div className="text-center p-10 sm:p-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 space-y-2">
          <Search className="mx-auto h-9 w-9 text-slate-300 mb-1" />
          <h3 className="text-sm sm:text-base font-semibold text-slate-700">No matching demands found</h3>
          <p className="text-slate-500 text-xs">
            No material requests matched your query &ldquo;<span className="font-medium text-slate-700">{searchQuery}</span>&rdquo;.
          </p>
          <button
            onClick={() => setSearchQuery("")}
            className="text-xs text-primary hover:underline font-semibold mt-2 cursor-pointer inline-block"
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredDemands.map((demand) => {
            const isQuoted = demand.already_quoted

            return (
              <Card key={demand.id} className="flex flex-col border-slate-200 shadow-xs hover:shadow-md transition-all">
                <CardContent className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-slate-800 leading-snug">
                            {demand.material}
                          </h3>
                          <p className="text-xs text-slate-500 font-medium">
                            Quantity: <span className="font-bold text-slate-700">{demand.quantity} {demand.unit}</span>
                          </p>
                        </div>
                      </div>

                      {isQuoted ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-semibold shrink-0">
                          Quoted
                        </Badge>
                      ) : (
                        <Badge variant="default" className="capitalize text-[10px] shrink-0 font-medium">
                          {demand.priority || "Medium"} Priority
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-800 truncate">{demand.company_name}</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-slate-600 truncate">{demand.project_name}</span>
                      </div>

                      {demand.required_by_date && (
                        <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-200/60 text-slate-500">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Required by: <strong className="text-slate-700">{new Date(demand.required_by_date).toLocaleDateString()}</strong></span>
                        </div>
                      )}
                    </div>

                    {demand.remarks && (
                      <p className="text-xs text-slate-500 italic mt-2 line-clamp-2">
                        &ldquo;{demand.remarks}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="pt-2">
                    {isQuoted ? (
                      <Link href="/dashboard/my-quotes" className="block w-full">
                        <Button variant="outline" className="w-full text-xs cursor-pointer flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> View in My Quotes
                        </Button>
                      </Link>
                    ) : (
                      <Button 
                        className="w-full bg-primary hover:bg-primary/90 text-white text-xs font-semibold py-2.5 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs" 
                        onClick={() => setSelectedDemand(demand)}
                      >
                        Apply to Supply (Submit Quote) <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {selectedDemand && (
        <SubmitQuoteModal
          rfp={{
            id: selectedDemand.rfp_id || selectedDemand.id,
            material_request_id: selectedDemand.material_request_id,
            material_requests: {
              material: selectedDemand.material,
              quantity: selectedDemand.quantity,
              unit: selectedDemand.unit,
              required_by_date: selectedDemand.required_by_date,
            },
            project_name: selectedDemand.project_name,
            company_name: selectedDemand.company_name,
          }}
          onClose={() => setSelectedDemand(null)}
          onSuccess={() => {
            fetchDemands()
          }}
        />
      )}
    </div>
  )
}
