"use client"

import { useEffect, useState } from "react"
import { deliveriesApi } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Truck, User, Navigation, Plus } from "lucide-react"
import { CreateDriverLinkModal } from "@/components/deliveries/CreateDriverLinkModal"

export default function FleetPage() {
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null)

  useEffect(() => {
    fetchDeliveries()
  }, [])

  const fetchDeliveries = async () => {
    try {
      setLoading(true)
      const res = await deliveriesApi.getAll()
      setDeliveries(res.data || [])
    } catch (err) {
      console.error("Failed to load fleet deliveries", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8 text-slate-500">Loading fleet data...</div>
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Fleet Management</h1>
          <p className="text-slate-500 mt-1">Manage vendor drivers, trucks, and live delivery dispatch links.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Truck className="w-5 h-5 mr-2 text-primary" />
              Active Dispatch Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deliveries.length === 0 ? (
              <div className="text-sm text-slate-500 bg-slate-50 p-6 rounded-lg text-center">
                No active delivery dispatches assigned.
              </div>
            ) : (
              <div className="space-y-3">
                {deliveries.map((del) => (
                  <div key={del.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <div>
                      <h4 className="font-bold text-slate-800">{del.material}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Qty: {del.quantity} • Expected: {new Date(del.expected_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{del.status || "Scheduled"}</Badge>
                      <Button size="sm" onClick={() => setSelectedDeliveryId(del.id)}>
                        <Navigation className="w-3.5 h-3.5 mr-1" /> Driver Link
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <User className="w-5 h-5 mr-2 text-emerald-600" />
              Registered Fleet Drivers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center">
              <div>
                <p className="font-semibold text-sm text-slate-800">Ramesh Singh</p>
                <p className="text-xs text-slate-500">Heavy Truck (UP-78-AB-1234)</p>
              </div>
              <Badge variant="success">Available</Badge>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center">
              <div>
                <p className="font-semibold text-sm text-slate-800">Suresh Kumar</p>
                <p className="text-xs text-slate-500 font-mono">Tipper (UP-78-CD-5678)</p>
              </div>
              <Badge variant="default">On Route</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedDeliveryId && (
        <CreateDriverLinkModal
          deliveryId={selectedDeliveryId}
          onClose={() => setSelectedDeliveryId(null)}
        />
      )}
    </div>
  )
}
