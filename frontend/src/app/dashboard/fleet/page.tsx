"use client"

import { useEffect, useState } from "react"
import { deliveriesApi, vendorsApi } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Input } from "@/components/ui/Input"
import { Truck, User, Navigation, Plus, Trash2, MapPin, CheckCircle2, Clock, ExternalLink, X, Loader2 } from "lucide-react"
import { CreateDriverLinkModal } from "@/components/deliveries/CreateDriverLinkModal"

export default function FleetPage() {
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [trucks, setTrucks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null)

  // Driver modal
  const [showAddDriver, setShowAddDriver] = useState(false)
  const [driverName, setDriverName] = useState("")
  const [driverPhone, setDriverPhone] = useState("")
  const [driverLoading, setDriverLoading] = useState(false)

  // Truck modal
  const [showAddTruck, setShowAddTruck] = useState(false)
  const [truckReg, setTruckReg] = useState("")
  const [truckType, setTruckType] = useState("Heavy Truck")
  const [truckCapacity, setTruckCapacity] = useState("10 Tons")
  const [truckLoading, setTruckLoading] = useState(false)

  // Success / error banner
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null)

  useEffect(() => {
    loadFleetData()
  }, [])

  const loadFleetData = async () => {
    try {
      setLoading(true)
      const [delRes, drvRes, trkRes] = await Promise.all([
        deliveriesApi.getAll().catch(() => ({ data: [] })),
        vendorsApi.getDrivers().catch(() => ({ data: [] })),
        vendorsApi.getTrucks().catch(() => ({ data: [] })),
      ])
      setDeliveries(delRes.data || [])
      setDrivers(drvRes.data || [])
      setTrucks(trkRes.data || [])
    } catch (err) {
      console.error("Failed to load fleet data", err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!driverName.trim() || !driverPhone.trim()) return

    try {
      setDriverLoading(true)
      await vendorsApi.createDriver({
        name: driverName.trim(),
        contact: driverPhone.trim(),
      })
      setDriverName("")
      setDriverPhone("")
      setShowAddDriver(false)
      setNotification({ type: "success", message: "Driver registered successfully!" })
      setTimeout(() => setNotification(null), 3500)
      loadFleetData()
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to register driver.")
    } finally {
      setDriverLoading(false)
    }
  }

  const handleDeleteDriver = async (driverId: string) => {
    if (!confirm("Are you sure you want to remove this driver?")) return
    try {
      await vendorsApi.deleteDriver(driverId)
      setNotification({ type: "success", message: "Driver removed." })
      setTimeout(() => setNotification(null), 3000)
      loadFleetData()
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to remove driver.")
    }
  }

  const handleAddTruck = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!truckReg.trim()) return

    try {
      setTruckLoading(true)
      await vendorsApi.createTruck({
        registration_number: truckReg.trim(),
        type: truckType,
        capacity: truckCapacity,
      })
      setTruckReg("")
      setShowAddTruck(false)
      setNotification({ type: "success", message: "Vehicle registered to fleet!" })
      setTimeout(() => setNotification(null), 3500)
      loadFleetData()
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to register vehicle.")
    } finally {
      setTruckLoading(false)
    }
  }

  const handleDeleteTruck = async (truckId: string) => {
    if (!confirm("Are you sure you want to remove this vehicle?")) return
    try {
      await vendorsApi.deleteTruck(truckId)
      setNotification({ type: "success", message: "Vehicle removed." })
      setTimeout(() => setNotification(null), 3000)
      loadFleetData()
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to remove vehicle.")
    }
  }

  const handleUpdateDeliveryStatus = async (delId: string, newStatus: string) => {
    try {
      await deliveriesApi.update(delId, { status: newStatus })
      setNotification({ type: "success", message: `Shipment marked as ${newStatus.replace("_", " ")}.` })
      setTimeout(() => setNotification(null), 3000)
      loadFleetData()
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to update shipment status.")
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center p-8 text-slate-500">
        <p className="text-sm">Loading fleet assets, drivers, and delivery assignments...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 pb-3 sm:pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800">Fleet & Dispatch Management</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Manage your registered drivers, vehicles, dispatch tracking links, and real-time delivery logistics.
          </p>
        </div>

        <div className="flex gap-2">
          <Button size="sm" onClick={() => setShowAddDriver(true)} className="text-xs flex items-center gap-1 cursor-pointer">
            <User className="w-3.5 h-3.5" /> Add Driver
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowAddTruck(true)} className="text-xs flex items-center gap-1 cursor-pointer">
            <Truck className="w-3.5 h-3.5" /> Add Vehicle
          </Button>
        </div>
      </div>

      {notification && (
        <div className={`p-3.5 rounded-xl border text-xs sm:text-sm flex items-center shadow-xs ${
          notification.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
        }`}>
          <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* 2-Column Grid: Left (Active Dispatches), Right (Drivers & Trucks) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Active Dispatches (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-primary" /> Active Delivery Shipments
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Deliveries scheduled from accepted vendor quotes
                </CardDescription>
              </div>
              <span className="text-xs bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                {deliveries.length} Shipments
              </span>
            </CardHeader>
            <CardContent className="p-4">
              {deliveries.length === 0 ? (
                <div className="text-center p-8 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-500 text-xs sm:text-sm">
                  <Truck className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                  No delivery shipments scheduled yet.
                  <p className="text-[11px] text-slate-400 mt-1">
                    When a company accepts your quotation, scheduled shipments will appear here for driver assignment.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deliveries.map((del) => {
                    const isDelivered = del.status === "delivered"
                    const isInTransit = del.status === "in_transit"
                    const hasLocation = del.last_lat && del.last_lng

                    return (
                      <div key={del.id} className="p-4 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-200/80 transition-all space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <h4 className="font-bold text-sm text-slate-800">{del.material || "Material Shipment"}</h4>
                            <p className="text-xs text-slate-500 font-medium">
                              Qty: <span className="text-slate-700 font-bold">{del.quantity}</span> • Project: <span className="text-slate-700 font-semibold">{del.projects?.name || "Project"}</span>
                            </p>
                          </div>
                          <Badge 
                            variant="default"
                            className={`capitalize text-xs font-semibold px-2 py-0.5 ${
                              isDelivered ? "bg-emerald-100 text-emerald-800 border-emerald-200" : isInTransit ? "bg-amber-100 text-amber-800 border-amber-200 animate-pulse" : "bg-blue-100 text-blue-800 border-blue-200"
                            }`}
                          >
                            {del.status?.replace("_", " ") || "Scheduled"}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100">
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Expected Date</span>
                            <span className="font-medium text-slate-700">{del.expected_date ? new Date(del.expected_date).toLocaleDateString() : "TBD"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Assigned Driver</span>
                            <span className="font-medium text-slate-700">{del.drivers?.name || "Unassigned"}</span>
                          </div>
                        </div>

                        {hasLocation && (
                          <div className="flex items-center justify-between text-xs bg-emerald-50 text-emerald-800 p-2 rounded-lg border border-emerald-100">
                            <span className="flex items-center gap-1 font-medium">
                              <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Live GPS: {del.last_lat?.toFixed(4)}, {del.last_lng?.toFixed(4)}
                            </span>
                            <a
                              href={`https://www.google.com/maps?q=${del.last_lat},${del.last_lng}`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold underline text-[11px] flex items-center gap-0.5 hover:text-emerald-950"
                            >
                              View Map <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button 
                            size="sm" 
                            onClick={() => setSelectedDeliveryId(del.id)}
                            className="text-xs flex items-center gap-1 bg-primary hover:bg-primary/90 text-white cursor-pointer"
                          >
                            <Navigation className="w-3 h-3" /> Generate Driver GPS Link
                          </Button>

                          {!isDelivered && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleUpdateDeliveryStatus(del.id, isInTransit ? "delivered" : "in_transit")}
                              className="text-xs cursor-pointer"
                            >
                              {isInTransit ? "Mark Delivered" : "Mark In Transit"}
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Drivers & Vehicles (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Registered Drivers Card */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-600" /> Registered Drivers
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Drivers available for delivery dispatch
                </CardDescription>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setShowAddDriver(true)} className="h-7 text-xs text-primary cursor-pointer">
                <Plus className="w-3.5 h-3.5 mr-0.5" /> Add
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 max-h-[260px] overflow-y-auto">
              {drivers.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-4">No drivers registered yet. Click &quot;Add&quot; above.</div>
              ) : (
                drivers.map((drv) => (
                  <div key={drv.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{drv.name}</p>
                      <p className="text-slate-500 font-mono text-[11px] mt-0.5">📞 {drv.contact}</p>
                    </div>
                    <button 
                      onClick={() => handleDeleteDriver(drv.id)}
                      className="text-slate-400 hover:text-red-500 p-1 transition cursor-pointer"
                      title="Remove driver"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Registered Fleet Vehicles Card */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-amber-600" /> Registered Fleet Vehicles
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Trucks, dumpers, and delivery transport
                </CardDescription>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setShowAddTruck(true)} className="h-7 text-xs text-primary cursor-pointer">
                <Plus className="w-3.5 h-3.5 mr-0.5" /> Add
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 max-h-[260px] overflow-y-auto">
              {trucks.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-4">No vehicles registered yet. Click &quot;Add&quot; above.</div>
              ) : (
                trucks.map((trk) => (
                  <div key={trk.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{trk.registration_number}</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">{trk.type || "Truck"} • {trk.capacity || "Capacity TBD"}</p>
                    </div>
                    <button 
                      onClick={() => handleDeleteTruck(trk.id)}
                      className="text-slate-400 hover:text-red-500 p-1 transition cursor-pointer"
                      title="Remove vehicle"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Driver GPS Link Modal */}
      {selectedDeliveryId && (
        <CreateDriverLinkModal
          deliveryId={selectedDeliveryId}
          onClose={() => setSelectedDeliveryId(null)}
        />
      )}

      {/* Add Driver Modal */}
      {showAddDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-1.5">
                <User className="w-4 h-4 text-emerald-600" /> Register Driver
              </h3>
              <button onClick={() => setShowAddDriver(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddDriver} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Driver Full Name *</label>
                <Input
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mobile / WhatsApp Contact *</label>
                <Input
                  required
                  placeholder="e.g. +91 9876543210"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddDriver(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={driverLoading}>
                  {driverLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null} Save Driver
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Truck Modal */}
      {showAddTruck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-amber-600" /> Register Fleet Vehicle
              </h3>
              <button onClick={() => setShowAddTruck(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddTruck} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Registration / Plate Number *</label>
                <Input
                  required
                  placeholder="e.g. UP-78-AB-1234"
                  value={truckReg}
                  onChange={(e) => setTruckReg(e.target.value)}
                  className="text-xs h-9 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vehicle Type</label>
                <select
                  value={truckType}
                  onChange={(e) => setTruckType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none"
                >
                  <option value="Heavy Dump Truck">Heavy Dump Truck</option>
                  <option value="Concrete Mixer (Transit)">Concrete Mixer (Transit)</option>
                  <option value="Flatbed Trailer">Flatbed Trailer</option>
                  <option value="Tipper">Tipper</option>
                  <option value="Light Commercial Vehicle">Light Commercial Vehicle</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payload Capacity</label>
                <Input
                  placeholder="e.g. 15 Metric Tons / 8 m³"
                  value={truckCapacity}
                  onChange={(e) => setTruckCapacity(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddTruck(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={truckLoading}>
                  {truckLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null} Save Vehicle
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
