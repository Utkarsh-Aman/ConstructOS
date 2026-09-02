"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { projectsApi } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Input } from "@/components/ui/Input"
import { Briefcase, Search, X, Plus } from "lucide-react"
import { LocationLink } from "@/components/ui/LocationLink"
import { CreateProjectModal } from "@/components/projects/CreateProjectModal"

export default function ProjectsPage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const res = await projectsApi.getAll()
      setProjects(res.data || [])
    } catch (error) {
      console.error("Failed to load projects", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects
    const q = searchQuery.toLowerCase().trim()
    return projects.filter((p) => {
      const name = (p.name || "").toLowerCase()
      const desc = (p.description || "").toLowerCase()
      const company = (p.companies?.name || "").toLowerCase()
      const location = typeof p.location === "string" 
        ? p.location.toLowerCase() 
        : (p.location?.address || p.location?.name || "").toLowerCase()
      const status = (p.status || "").toLowerCase()
      return name.includes(q) || desc.includes(q) || company.includes(q) || location.includes(q) || status.includes(q)
    })
  }, [projects, searchQuery])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center p-8">
        <p className="text-slate-500 text-sm">Loading projects...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 pb-3 sm:pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800">Projects</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Manage, search, and view your construction projects.</p>
        </div>
        
        {user?.role === "company_admin" && (
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" /> Create Project
          </Button>
        )}
      </div>

      {/* Real-time Project Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            type="text"
            placeholder="Search projects by name, location, company..."
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

        {projects.length > 0 && (
          <div className="text-xs text-slate-500 font-medium self-end sm:self-center">
            Showing <span className="font-bold text-slate-700">{filteredProjects.length}</span> of {projects.length} projects
          </div>
        )}
      </div>

      <CreateProjectModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => {
          fetchProjects()
        }}
      />

      {projects.length === 0 ? (
        <div className="text-center p-10 sm:p-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
          <Briefcase className="mx-auto h-10 w-10 text-slate-300 mb-3" />
          <h3 className="text-base font-semibold text-slate-700">No projects found</h3>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">You don't have any active projects.</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center p-10 sm:p-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 space-y-2">
          <Search className="mx-auto h-9 w-9 text-slate-300 mb-1" />
          <h3 className="text-sm sm:text-base font-semibold text-slate-700">No matching projects found</h3>
          <p className="text-slate-500 text-xs">
            No projects matched your query &ldquo;<span className="font-medium text-slate-700">{searchQuery}</span>&rdquo;.
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
          {filteredProjects.map((project) => (
            <Link key={project.id} href={`/dashboard/projects/${project.id}`} className="group block h-full">
              <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-primary/50 group-hover:-translate-y-0.5 border-slate-200">
                <CardHeader className="pb-2.5 p-4 sm:p-5">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-base sm:text-lg font-bold group-hover:text-primary transition-colors leading-snug">
                      {project.name}
                    </CardTitle>
                    <Badge variant={project.status === "active" ? "success" : "default"} className="shrink-0 text-[11px] capitalize">
                      {project.status || "Active"}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center mt-1.5 text-xs text-slate-500">
                    <Briefcase className="w-3.5 h-3.5 mr-1 opacity-70 shrink-0" />
                    <span className="truncate">{project.companies?.name || "Company"}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-5 pt-0">
                  <p className="text-xs sm:text-sm text-slate-600 line-clamp-3 leading-relaxed">
                    {project.description || "No description provided for this project."}
                  </p>
                  
                  <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center text-xs font-medium text-slate-500">
                    <LocationLink location={project.location} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
