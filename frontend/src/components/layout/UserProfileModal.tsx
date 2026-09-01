"use client"

import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { X, User, Mail, Phone, Shield, CheckCircle2, Copy } from "lucide-react"
import { useState } from "react"

interface UserProfileModalProps {
  onClose: () => void
}

export function UserProfileModal({ onClose }: UserProfileModalProps) {
  const { user, logout } = useAuth()
  const [copied, setCopied] = useState(false)

  if (!user) return null

  const handleCopyId = () => {
    if (user.id) {
      navigator.clipboard.writeText(user.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg">
              {user.name?.charAt(0) || "U"}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{user.name}</h2>
              <p className="text-xs text-slate-500 capitalize">{user.role?.replace("_", " ")} Account</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center">
                <Shield className="w-3.5 h-3.5 mr-1.5 text-primary" /> Platform Role
              </span>
              <Badge variant="default" className="capitalize">
                {user.role?.replace("_", " ")}
              </Badge>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center">
                <Mail className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> Email Address
              </span>
              <span className="font-medium text-slate-800 text-xs">{user.email || "N/A"}</span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center">
                <Phone className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> Phone Number
              </span>
              <span className="font-medium text-slate-800 text-xs">{user.phone || "N/A"}</span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> Account Status
              </span>
              <Badge variant="success">Active</Badge>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">User Identifier (UUID)</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={user.id}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-xs font-mono text-slate-600 focus:outline-none"
              />
              <Button onClick={handleCopyId} size="sm" variant="outline" className="shrink-0">
                {copied ? "Copied" : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
