"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Users, UserPlus, HardHat, Phone, ToggleLeft, ToggleRight } from "lucide-react"

export default function GroupPage() {
  const { user } = useAuth()
  const [members, setMembers] = useState([
    { id: "1", name: "Vikram Sharma", trade: "Mason", phone: "+91 98765 43210", status: "active" },
    { id: "2", name: "Anil Verma", trade: "Bar Bender", phone: "+91 98765 43211", status: "active" },
    { id: "3", name: "Sunil Paswan", trade: "Helper", phone: "+91 98765 43212", status: "active" },
    { id: "4", name: "Ramesh Yadav", trade: "Carpenter", phone: "+91 98765 43213", status: "active" },
  ])

  const [newName, setNewName] = useState("")
  const [newTrade, setNewTrade] = useState("")
  const [newPhone, setNewPhone] = useState("")

  const toggleMemberStatus = (id: string) => {
    setMembers(prev =>
      prev.map(m =>
        m.id === id ? { ...m, status: m.status === "active" ? "inactive" : "active" } : m
      )
    )
  }

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName || !newTrade) return
    setMembers([
      ...members,
      {
        id: String(Date.now()),
        name: newName,
        trade: newTrade,
        phone: newPhone || "+91 98000 00000",
        status: "active",
      },
    ])
    setNewName("")
    setNewTrade("")
    setNewPhone("")
  }

  const activeCount = members.filter(m => m.status === "active").length

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">My Worker Group</h1>
          <p className="text-slate-500 mt-1">Manage group members and toggle availability status.</p>
        </div>
        <div className="bg-emerald-50 text-emerald-800 px-4 py-2 rounded-xl text-sm font-semibold border border-emerald-100">
          {activeCount} Active / {members.length} Total Members
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Users className="w-5 h-5 mr-2 text-primary" />
              Group Squad Roster
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {members.map((m) => (
              <div key={m.id} className="flex justify-between items-center p-3.5 bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-200 transition-all">
                <div className="flex items-center space-x-3">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm ${
                    m.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {m.name.charAt(0)}
                  </div>
                  <div>
                    <p className={`font-semibold text-sm ${m.status === 'active' ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                      {m.name}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center">
                      <HardHat className="w-3 h-3 mr-1 text-slate-400" />
                      {m.trade} • <Phone className="w-3 h-3 ml-2 mr-1 text-slate-400" /> {m.phone}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Badge variant={m.status === "active" ? "success" : "secondary"}>
                    {m.status}
                  </Badge>
                  
                  <button
                    onClick={() => toggleMemberStatus(m.id)}
                    className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                    title={`Click to mark as ${m.status === 'active' ? 'inactive' : 'active'}`}
                  >
                    {m.status === "active" ? (
                      <ToggleRight className="w-7 h-7 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="w-7 h-7 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <UserPlus className="w-5 h-5 mr-2 text-emerald-600" />
              Add Group Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddMember} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Worker Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Full name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Trade *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mason, Welder"
                  value={newTrade}
                  onChange={(e) => setNewTrade(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+91 98765 00000"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <Button type="submit" className="w-full mt-2" size="sm">
                Add to Group
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
