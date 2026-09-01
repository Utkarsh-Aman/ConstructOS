"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { projectsApi } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Briefcase } from "lucide-react"
import { LocationLink } from "@/components/ui/LocationLink"
import { CreateProjectModal } from "@/components/projects/CreateProjectModal"

export default function ProjectsPage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

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

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-slate-500">Loading projects...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Projects</h1>
          <p className="text-slate-500 mt-1">Manage and view your construction projects.</p>
        </div>
        
        {user?.role === "company_admin" && (
          <Button onClick={() => setIsModalOpen(true)}>Create Project</Button>
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
        <div className="text-center p-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
          <Briefcase className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-700">No projects found</h3>
          <p className="text-slate-500 mt-2">You don't have any active projects.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link key={project.id} href={`/dashboard/projects/${project.id}`} className="group block h-full">
              <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-primary/50 group-hover:-translate-y-1">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">
                      {project.name}
                    </CardTitle>
                    <Badge variant={project.status === "active" ? "success" : "default"}>
                      {project.status || "Active"}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center mt-2">
                    <Briefcase className="w-4 h-4 mr-1 opacity-70" />
                    {project.companies?.name || "Company"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 line-clamp-3">
                    {project.description || "No description provided for this project."}
                  </p>
                  
                  <div className="mt-4 flex items-center text-xs font-medium text-slate-500">
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
