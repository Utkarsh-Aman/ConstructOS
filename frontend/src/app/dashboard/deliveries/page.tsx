"use client"

import { useEffect, useState } from "react"
import { deliveriesApi } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Truck, MapPin, Clock, Link2, ExternalLink, RefreshCw, Navigation, CheckCircle2, Check } from "lucide-react"
import { CreateDriverLinkModal } from "@/components/deliveries/CreateDriverLinkModal"

export default function DeliveriesPage() {
  const { user } = useAuth()
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [updatingLocationId, setUpdatingLocationId] = useState<string | null>(null)
  const [selectedDeliveryForLink, setSelectedDeliveryForLink] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string>("")
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    fetchDeliveries()
    // Poll updates every 20 seconds for live site tracking
    const timer = setInterval(() => {
      fetchDeliveries(true)
    }, 20000)
    return () => clearInterval(timer)
  }, [])

  const fetchDeliveries = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      else setRefreshing(true)
      const res = await deliveriesApi.getAll()
      setDeliveries(res.data || [])
    } catch (error) {
      console.error("Failed to load deliveries", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleUpdateMyLocation = (deliveryId: string) => {
    if (!("geolocation" in navigator)) {
      alert("Geolocation is not supported by your browser.")
      return
    }

    setUpdatingLocationId(deliveryId)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await deliveriesApi.postMyLocation(deliveryId, {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            speed: pos.coords.speed || 35.0,
            accuracy: pos.coords.accuracy || 10.0,
          })
          setSuccessMsg("Location updated successfully!")
          setTimeout(() => setSuccessMsg(""), 4000)
          await fetchDeliveries(true)
        } catch (err: any) {
          alert(err.response?.data?.detail || "Failed to update location.")
        } finally {
          setUpdatingLocationId(null)
        }
      },
      async () => {
        // Fallback simulated GPS coordinates for testing
        try {
          const mockLat = 26.8467 + (Math.random() - 0.5) * 0.015
          const mockLng = 80.9462 + (Math.random() - 0.5) * 0.015
          await deliveriesApi.postMyLocation(deliveryId, {
            lat: mockLat,
            lng: mockLng,
            speed: 40.0,
            accuracy: 10.0,
          })
          setSuccessMsg("Simulated GPS coordinates transmitted!")
          setTimeout(() => setSuccessMsg(""), 4000)
          await fetchDeliveries(true)
        } catch (err: any) {
          alert(err.response?.data?.detail || "Failed to update location.")
        } finally {
          setUpdatingLocationId(null)
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleMarkDelivered = async (deliveryId: string) => {
    try {
      setStatusUpdatingId(deliveryId)
      await deliveriesApi.update(deliveryId, { status: "delivered" })
      setSuccessMsg("Material shipment marked as received & delivered!")
      setTimeout(() => setSuccessMsg(""), 4000)
      await fetchDeliveries(true)
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to update delivery status.")
    } finally {
      setStatusUpdatingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500 space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
        <p className="text-sm">Loading delivery shipments and GPS tracking...</p>
      </div>
    )
  }

  const isDriver = user?.role === "driver"

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">
            {isDriver ? "My Assigned Shipments" : "Deliveries & Live Tracking"}
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            {isDriver
              ? "View your assigned dispatch routes and transmit real-time GPS location."
              : "Real-time GPS tracking for materials, dispatch routes, and inbound shipments."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDeliveries()}
            disabled={refreshing}
            className="text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Syncing..." : "Sync Live GPS"}
          </Button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl flex items-center shadow-xs">
          <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {deliveries.length === 0 ? (
        <div className="text-center p-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/60">
          <Truck className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <h3 className="text-lg font-semibold text-slate-700">No active deliveries</h3>
          <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
            There are currently no active material shipments scheduled or in transit for your assigned projects.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {deliveries.map((delivery) => {
            const hasLocation = delivery.last_lat && delivery.last_lng
            const mapsUrl = hasLocation
              ? `https://www.google.com/maps?q=${delivery.last_lat},${delivery.last_lng}`
              : null

            const isUpdatingThis = updatingLocationId === delivery.id
            const isDelivered = delivery.status === "delivered"
            const isStatusUpdating = statusUpdatingId === delivery.id

            return (
              <Card key={delivery.id} className="flex flex-col shadow-xs hover:shadow-md transition border-slate-200">
                <CardContent className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-3 gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Truck className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-bold text-base text-slate-800 truncate">
                              {delivery.material || "Material Shipment"}
                            </h3>
                            {delivery.quantity && (
                              <p className="text-xs text-slate-500 font-medium">
                                Quantity: {delivery.quantity}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant="default"
                        className={`capitalize shrink-0 text-xs px-2.5 py-0.5 font-semibold ${
                          delivery.status === "in_transit"
                            ? "bg-amber-100 text-amber-800 border-amber-200 animate-pulse"
                            : isDelivered
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : "bg-blue-100 text-blue-800 border-blue-200"
                        }`}
                      >
                        {delivery.status ? delivery.status.replace("_", " ") : "Scheduled"}
                      </Badge>
                    </div>

                    {delivery.projects?.name && (
                      <div className="mb-3 px-3 py-1.5 bg-slate-100/70 rounded-md text-xs text-slate-600 font-medium">
                        Project: <span className="text-slate-800 font-semibold">{delivery.projects.name}</span>
                      </div>
                    )}

                    {/* Live GPS Panel */}
                    <div className="space-y-2.5 text-xs text-slate-600 my-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                              Current Location
                            </p>
                            <p className="font-mono font-medium text-slate-700 mt-0.5">
                              {hasLocation
                                ? `${delivery.last_lat.toFixed(5)}, ${delivery.last_lng.toFixed(5)}`
                                : "Awaiting driver updates"}
                            </p>
                          </div>
                        </div>

                        {mapsUrl && (
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-lg transition shrink-0"
                            title="Open Google Maps in new tab"
                          >
                            <span>Google Maps</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3.5 h-3.5" /> Last Ping:
                        </span>
                        <span className="font-medium text-slate-700">
                          {delivery.last_location_updated_at
                            ? new Date(delivery.last_location_updated_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })
                            : "Never"}
                        </span>
                      </div>
                    </div>

                    {(delivery.drivers?.name || delivery.quotes?.vendors?.business_name) && (
                      <div className="text-xs text-slate-500 space-y-1 mb-4">
                        {delivery.drivers?.name && (
                          <p>
                            Driver: <span className="font-medium text-slate-700">{delivery.drivers.name}</span>
                            {delivery.drivers.contact && ` (${delivery.drivers.contact})`}
                          </p>
                        )}
                        {delivery.quotes?.vendors?.business_name && (
                          <p>
                            Vendor: <span className="font-medium text-slate-700">{delivery.quotes.vendors.business_name}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions depending on Role */}
                  <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                    {/* ONLY Driver role sees "Update Live Location" */}
                    {isDriver && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateMyLocation(delivery.id)}
                        disabled={isUpdatingThis || isDelivered}
                        className="w-full bg-primary hover:bg-primary/90 text-white text-xs font-semibold py-2.5 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        {isUpdatingThis ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Transmitting GPS...
                          </>
                        ) : (
                          <>
                            <Navigation className="w-3.5 h-3.5" /> 📍 Transmit My Live GPS
                          </>
                        )}
                      </Button>
                    )}

                    {/* Non-Driver Roles (Company Admin, Site Manager, Vendor) */}
                    {!isDriver && (
                      <>
                        {/* Driver link generator */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedDeliveryForLink(delivery.id)}
                          className="w-full text-xs text-slate-700 hover:text-slate-900 border-slate-300 cursor-pointer"
                        >
                          <Link2 className="w-3.5 h-3.5 mr-1.5 text-primary" /> Generate Driver Tracking Link
                        </Button>

                        {/* Site Manager / Company Admin can confirm delivery when received */}
                        {!isDelivered && (user?.role === "company_admin" || user?.role === "site_manager") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMarkDelivered(delivery.id)}
                            disabled={isStatusUpdating}
                            className="w-full text-xs text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                            {isStatusUpdating ? "Confirming..." : "Confirm Material Received (Delivered)"}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {selectedDeliveryForLink && (
        <CreateDriverLinkModal
          deliveryId={selectedDeliveryForLink}
          onClose={() => setSelectedDeliveryForLink(null)}
        />
      )}
    </div>
  )
}
