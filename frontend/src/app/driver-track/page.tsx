"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { deliveriesApi } from "@/lib/api"
import { Button } from "@/components/ui/Button"
import { Truck, Navigation, CheckCircle2, AlertTriangle, MapPin, ExternalLink, RefreshCw } from "lucide-react"

function DriverTrackContent() {
  const searchParams = useSearchParams()
  const deliveryId = searchParams.get("delivery_id")
  const linkToken = searchParams.get("link_token")

  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [isBroadcasting, setIsBroadcasting] = useState(false)
  const [lastPingTime, setLastPingTime] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const [updating, setUpdating] = useState(false)

  const sendLocationUpdate = async (latitude: number, longitude: number) => {
    if (!deliveryId) {
      setErrorMsg("Missing delivery ID in tracking link")
      return
    }

    try {
      setUpdating(true)
      setErrorMsg("")

      if (linkToken) {
        await deliveriesApi.postLocationUpdate(deliveryId, {
          lat: latitude,
          lng: longitude,
          link_token: linkToken,
          speed: 40.0,
          accuracy: 5.0,
        })
      } else {
        // Authenticated direct update fallback
        await deliveriesApi.postMyLocation(deliveryId, {
          lat: latitude,
          lng: longitude,
          speed: 40.0,
          accuracy: 5.0,
        })
      }

      setLastPingTime(new Date().toLocaleTimeString())
      setStatusMsg("GPS location transmitted successfully to site dispatch.")
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to transmit location update.")
    } finally {
      setUpdating(false)
    }
  }

  const handleManualPing = () => {
    if ("geolocation" in navigator) {
      setUpdating(true)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const latitude = pos.coords.latitude
          const longitude = pos.coords.longitude
          setLat(latitude)
          setLng(longitude)
          sendLocationUpdate(latitude, longitude)
        },
        (err) => {
          // Dev fallback if geolocation denied
          const mockLat = 26.8467 + (Math.random() - 0.5) * 0.01
          const mockLng = 80.9462 + (Math.random() - 0.5) * 0.01
          setLat(mockLat)
          setLng(mockLng)
          sendLocationUpdate(mockLat, mockLng)
        },
        { enableHighAccuracy: true, timeout: 10000 }
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
      interval = setInterval(handleManualPing, 20000) // Ping every 20s
    }
    return () => clearInterval(interval)
  }, [isBroadcasting])

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="h-16 w-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto border border-primary/30 shadow-inner">
            <Truck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Driver Live GPS Portal</h1>
          <p className="text-xs text-slate-400">
            Delivery ID: <span className="font-mono text-primary font-semibold">#{deliveryId ? deliveryId.substring(0, 8) : "N/A"}</span>
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-300 text-xs rounded-xl flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {statusMsg && (
          <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center">
            <CheckCircle2 className="w-4 h-4 mr-2 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3 text-sm">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary" /> Current GPS
            </span>
            <span className="font-mono text-slate-200">
              {lat && lng ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : "Awaiting GPS"}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-800/80">
            <span>Last Transmitted</span>
            <span className="font-mono text-emerald-400 font-medium">
              {lastPingTime ? lastPingTime : "Never"}
            </span>
          </div>

          {lat && lng && (
            <div className="pt-2 border-t border-slate-800/80 flex justify-end">
              <a
                href={`https://www.google.com/maps?q=${lat},${lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 font-medium underline-offset-2 hover:underline"
              >
                View on Google Maps <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        <div className="space-y-3 pt-2">
          <Button
            onClick={handleManualPing}
            disabled={updating}
            className="w-full py-3.5 text-sm font-bold bg-primary hover:bg-primary/90 text-white shadow-lg flex items-center justify-center gap-2"
          >
            {updating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Transmitting GPS...
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4" /> Update My Location Now
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsBroadcasting(!isBroadcasting)}
            className={`w-full py-3 text-xs font-semibold border ${
              isBroadcasting
                ? "border-red-500/50 text-red-400 hover:bg-red-500/10"
                : "border-slate-700 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Navigation className="w-3.5 h-3.5 mr-1.5" />
            {isBroadcasting ? "Stop Auto-Broadcast" : "Start Auto-Broadcast (Every 20s)"}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function DriverTrackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 text-sm text-slate-400">
        Loading tracking portal...
      </div>
    }>
      <DriverTrackContent />
    </Suspense>
  )
}
