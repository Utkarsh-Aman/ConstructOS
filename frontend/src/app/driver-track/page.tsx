"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { deliveriesApi } from "@/lib/api"
import { Button } from "@/components/ui/Button"
import { Truck, Navigation, CheckCircle2, AlertTriangle } from "lucide-react"

export default function DriverTrackPage() {
  const searchParams = useSearchParams()
  const deliveryId = searchParams.get("delivery_id")
  const linkToken = searchParams.get("link_token")

  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [isBroadcasting, setIsBroadcasting] = useState(false)
  const [lastPingTime, setLastPingTime] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState("")
  const [errorMsg, setErrorMsg] = useState("")

  const sendLocationUpdate = async (latitude: number, longitude: number) => {
    if (!deliveryId || !linkToken) {
      setErrorMsg("Invalid tracking link or missing parameters")
      return
    }

    try {
      await deliveriesApi.postLocationUpdate(deliveryId, {
        lat: latitude,
        lng: longitude,
        link_token: linkToken,
        speed: 45.5,
        accuracy: 10.0,
      })
      setLastPingTime(new Date().toLocaleTimeString())
      setStatusMsg("GPS update transmitted successfully to dispatch.")
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to update location")
    }
  }

  const handleManualPing = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude)
          setLng(pos.coords.longitude)
          sendLocationUpdate(pos.coords.latitude, pos.coords.longitude)
        },
        (err) => {
          // Fallback simulation for dev environment if GPS permission denied
          const mockLat = 26.8467 + (Math.random() - 0.5) * 0.01
          const mockLng = 80.9462 + (Math.random() - 0.5) * 0.01
          setLat(mockLat)
          setLng(mockLng)
          sendLocationUpdate(mockLat, mockLng)
        }
      )
    } else {
      const mockLat = 26.8467
      const mockLng = 80.9462
      setLat(mockLat)
      setLng(mockLng)
      sendLocationUpdate(mockLat, mockLng)
    }
  }

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isBroadcasting) {
      handleManualPing()
      interval = setInterval(handleManualPing, 30000) // Ping every 30s
    }
    return () => clearInterval(interval)
  }, [isBroadcasting])

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="h-16 w-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto border border-primary/30">
            <Truck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Driver Dispatch Portal</h1>
          <p className="text-xs text-slate-400">Delivery ID: #{deliveryId?.substring(0, 8) || "N/A"}</p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-300 text-xs rounded-xl flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2 shrink-0" />
            {errorMsg}
          </div>
        )}

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-750 space-y-3 text-sm">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Lat / Lng</span>
            <span className="font-mono text-slate-200">
              {lat && lng ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : "Not acquired"}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-800">
            <span>Last Ping</span>
            <span className="font-mono text-emerald-400">
              {lastPingTime ? lastPingTime : "Never"}
            </span>
          </div>
        </div>

        {statusMsg && (
          <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center">
            <CheckCircle2 className="w-4 h-4 mr-2 shrink-0" />
            {statusMsg}
          </div>
        )}

        <div className="space-y-3">
          <Button
            onClick={() => setIsBroadcasting(!isBroadcasting)}
            className={`w-full py-3 text-sm font-bold ${
              isBroadcasting ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            <Navigation className="w-4 h-4 mr-2" />
            {isBroadcasting ? "Stop Live Broadcast" : "Start Live Broadcast"}
          </Button>

          <Button
            variant="outline"
            onClick={handleManualPing}
            className="w-full text-slate-300 border-slate-700 hover:bg-slate-700/50 text-xs"
          >
            Send Single Location Update Now
          </Button>
        </div>
      </div>
    </div>
  )
}
