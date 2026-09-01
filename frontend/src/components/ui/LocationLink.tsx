import * as React from "react"
import { MapPin, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

interface LocationLinkProps {
  location?: string
  className?: string
  iconClassName?: string
  showIcon?: boolean
}

export function LocationLink({
  location,
  className,
  iconClassName = "w-3.5 h-3.5 text-slate-400 mr-1 shrink-0 group-hover:text-primary transition-colors",
  showIcon = true,
}: LocationLinkProps) {
  if (!location) {
    return <span className="text-slate-400 italic">Location not specified</span>
  }

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "inline-flex items-center text-slate-700 hover:text-primary hover:underline group font-medium transition-colors cursor-pointer",
        className
      )}
      title="Search location on Google Maps"
    >
      {showIcon && <MapPin className={iconClassName} />}
      <span className="truncate">{location}</span>
      <ExternalLink className="w-3 h-3 ml-1 opacity-50 group-hover:opacity-100 shrink-0 transition-opacity" />
    </a>
  )
}
