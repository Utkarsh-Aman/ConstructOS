"use client"

import { useEffect, useState } from "react"
import { deliveriesApi } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Truck, MapPin, Clock, Link2 } from "lucide-react"
import { CreateDriverLinkModal } from "@/components/deliveries/CreateDriverLinkModal"

export default function DeliveriesPage() {
  const { user } = useAuth()
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDeliveryForLink, setSelectedDeliveryForLink] = useState<string | null>(null)

  useEffect(() => {
    fetchDeliveries()
  }, [])

  const fetchDeliveries = async () => {
    try {
      setLoading(true)
      const res = await deliveriesApi.getAll()
      setDeliveries(res.data || [])
    } catch (error) {
      console.error("Failed to load deliveries", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8 text-slate-500">Loading deliveries...</div>
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Deliveries & Tracking</h1>
          <p className="text-slate-500 mt-1">Track inbound material shipments and driver dispatch.</p>
        </div>
      </div>

      {deliveries.length === 0 ? (
        <div className="text-center p-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
          <Truck className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-700">No active deliveries</h3>
          <p className="text-slate-500 mt-2">There are currently no active material deliveries in transit.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {deliveries.map((delivery) => (
            <Card key={delivery.id} className="flex flex-col">
              <CardContent className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <Truck className="w-5 h-5 text-primary mr-2" />
                      <h3 className="font-bold text-lg text-slate-800">{delivery.material || "Shipment"}</h3>
                    </div>
                    {delivery.vendors?.business_name && (
                      <p className="text-xs text-slate-500 mt-1">Vendor: {delivery.vendors.business_name}</p>
                    )}
                  </div>
                  <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-none capitalize">
                    {delivery.status || "In Transit"}
                  </Badge>
                </div>
                
                <div className="space-y-3 text-sm text-slate-600 mb-6 flex-1 bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <div className="flex items-start">
                    <MapPin className="w-4 h-4 mr-2 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Last Known GPS</p>
                      <p className="font-medium text-slate-700 mt-0.5">
                        {delivery.last_lat && delivery.last_lng 
                          ? `${delivery.last_lat.toFixed(4)}, ${delivery.last_lng.toFixed(4)}`
                          : "Awaiting driver updates"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start pt-3 border-t border-slate-200/60">
                    <Clock className="w-4 h-4 mr-2 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Last Pinged</p>
                      <p className="font-medium text-slate-700 mt-0.5">
                        {delivery.last_location_updated_at 
                          ? new Date(delivery.last_location_updated_at).toLocaleString()
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {user?.role === "vendor" && (
                  <div className="mt-auto">
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => setSelectedDeliveryForLink(delivery.id)}
                    >
                      <Link2 className="w-4 h-4 mr-2" /> Driver Dispatch Link
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
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
