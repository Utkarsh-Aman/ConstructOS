"use client"

import { useEffect, useState, useRef } from "react"
import { projectsApi, projectRagApi } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { 
  Bot, 
  Send, 
  FileText, 
  Upload, 
  Sparkles, 
  Building2, 
  FileCheck2, 
  AlertCircle, 
  Loader2, 
  BookOpen, 
  Layers, 
  ExternalLink 
} from "lucide-react"
import { MarkdownContent } from "@/components/ui/MarkdownContent"

interface Message {
  role: "user" | "assistant"
  content: string
  sources?: any[]
  grounded?: boolean
  timestamp: string
}

export default function AIProjectQueryPage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>("")
  const [documents, setDocuments] = useState<any[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [loadingDocs, setLoadingDocs] = useState(false)
  
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I am your ConstructOS AI Project Assistant. Select a project above and ask any question about your drawings, master plans, material specs, or safety codes.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }
  ])
  const [inputQuery, setInputQuery] = useState("")
  const [querying, setQuerying] = useState(false)
  
  // Upload modal / state
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState("")
  const [uploadError, setUploadError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatBottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    if (selectedProjectId) {
      fetchProjectDocuments(selectedProjectId)
    }
  }, [selectedProjectId])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const fetchProjects = async () => {
    try {
      setLoadingProjects(true)
      const res = await projectsApi.getAll()
      const data = res.data || []
      setProjects(data)
      if (data.length > 0) {
        setSelectedProjectId(data[0].id)
      }
    } catch (err) {
      console.error("Failed to load projects", err)
    } finally {
      setLoadingProjects(false)
    }
  }

  const fetchProjectDocuments = async (projId: string) => {
    try {
      setLoadingDocs(true)
      const res = await projectRagApi.getDocuments(projId)
      setDocuments(res.data || [])
    } catch (err) {
      console.error("Failed to load documents", err)
    } finally {
      setLoadingDocs(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedProjectId) return

    try {
      setUploading(true)
      setUploadError("")
      setUploadSuccess("")

      const formData = new FormData()
      formData.append("file", file)
      formData.append("document_title", file.name.replace(/\.[^/.]+$/, ""))
      formData.append("source_type", "ProjectDocument")

      const res = await projectRagApi.ingestDocument(selectedProjectId, formData)
      setUploadSuccess(`Successfully indexed "${res.data.title}" (${res.data.chunks_indexed} vector chunks)`)
      fetchProjectDocuments(selectedProjectId)
      
      // Auto-post a system message in chat
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: `📁 New document indexed: **${res.data.title}**. You can now ask questions about this document!`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }
      ])
    } catch (err: any) {
      setUploadError(err.response?.data?.detail || "Failed to upload and index document")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleSendQuery = async (queryText?: string) => {
    const query = queryText || inputQuery
    if (!query.trim() || !selectedProjectId || querying) return

    const userMsg: Message = {
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

    setMessages(prev => [...prev, userMsg])
    setInputQuery("")
    setQuerying(true)

    try {
      // Build brief chat history
      const history = messages.slice(-4).map(m => ({
        role: m.role,
        content: m.content,
      }))

      const res = await projectRagApi.queryProject(selectedProjectId, {
        question: query,
        chat_history: history,
      })

      const aiMsg: Message = {
        role: "assistant",
        content: res.data.answer || "No response received.",
        sources: res.data.sources || [],
        grounded: res.data.grounded,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }

      setMessages(prev => [...prev, aiMsg])
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ Error: ${err.response?.data?.detail || "Could not retrieve answer from AI service."}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }
      ])
    } finally {
      setQuerying(false)
    }
  }

  const selectedProject = projects.find(p => p.id === selectedProjectId)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 flex items-center gap-2.5">
            <Bot className="w-8 h-8 text-primary" /> AI Project Knowledge & Query
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Query specifications, safety codes, drawings, and knowledge base documents grounded on your active projects.
          </p>
        </div>

        {/* Project Selector */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-2 shadow-sm">
          <Building2 className="w-4 h-4 text-slate-400 ml-1 shrink-0" />
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            disabled={loadingProjects || projects.length === 0}
            className="text-sm font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer pr-2"
          >
            {projects.length === 0 ? (
              <option value="">No Active Projects</option>
            ) : (
              projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Main Grid: Left side documents / metadata, Right side Chat Query Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Project Documents & Ingestion (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="p-4 pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" /> Project Knowledge Base
                </CardTitle>
                <span className="text-xs bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">
                  {documents.length} Docs
                </span>
              </div>
              <CardDescription className="text-xs text-slate-500">
                Documents indexed for <span className="font-semibold text-slate-700">{selectedProject?.name || "Selected Project"}</span>
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {/* Document upload button */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf,.txt,.doc,.docx"
                className="hidden"
              />

              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || !selectedProjectId}
                className="w-full bg-primary hover:bg-primary/90 text-white text-xs font-semibold py-2.5 flex items-center justify-center gap-2 shadow-sm"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Indexing PDF Chunks...
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" /> Upload Document to RAG
                  </>
                )}
              </Button>

              {uploadSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              {uploadError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Indexed documents list */}
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {loadingDocs ? (
                  <div className="text-center py-6 text-xs text-slate-400">Loading indexed documents...</div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-6 px-3 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-xs text-slate-500">
                    <FileText className="w-6 h-6 mx-auto text-slate-300 mb-1" />
                    No custom documents indexed for this project yet.
                    <p className="text-[11px] text-slate-400 mt-1">
                      Upload a PDF above to ground questions on this project!
                    </p>
                  </div>
                ) : (
                  documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl transition space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-800 truncate max-w-[200px]" title={doc.title}>
                          {doc.title}
                        </span>
                        <span className="text-[10px] bg-slate-200/80 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                          {doc.source_type}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Indexed: {new Date(doc.ingested_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Project Scope KB badge */}
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-[11px]">Strictly Project-Scoped</p>
                  <p className="text-[10px] text-blue-700 mt-0.5">
                    Answers are strictly grounded in drawings, master plans, and documents uploaded to this project.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: AI Query Console (8 cols) */}
        <div className="lg:col-span-8">
          <Card className="shadow-sm border-slate-200 flex flex-col h-[650px]">
            <CardHeader className="p-4 border-b border-slate-100 shrink-0 bg-slate-50/50">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" /> AI Project Assistant Console
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Grounded on project: <span className="font-semibold text-slate-700">{selectedProject?.name || "All Projects"}</span>
                  </CardDescription>
                </div>
                {selectedProject && (
                  <span className="text-xs px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-semibold">
                    RAG Active
                  </span>
                )}
              </div>
            </CardHeader>

            {/* Chat message stream */}
            <CardContent className="p-4 flex-1 overflow-y-auto space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-white rounded-br-none shadow-sm"
                        : "bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    ) : (
                      <MarkdownContent content={msg.content} />
                    )}

                    <div
                      className={`text-[10px] mt-2 ${
                        msg.role === "user" ? "text-white/70 text-right" : "text-slate-400"
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              ))}

              {querying && (
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 w-fit">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>Searching vector embeddings and generating answer...</span>
                </div>
              )}

              <div ref={chatBottomRef} />
            </CardContent>

            {/* Quick Prompts & Query Input Bar */}
            <div className="p-3 border-t border-slate-100 bg-white shrink-0 space-y-2">
              {/* Suggested quick chips */}
              <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
                <button
                  onClick={() => handleSendQuery("What are the key technical specifications of this project?")}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 whitespace-nowrap transition"
                >
                  📋 Technical Specs
                </button>
                <button
                  onClick={() => handleSendQuery("What safety regulations and standards apply?")}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 whitespace-nowrap transition"
                >
                  🦺 Safety Rules
                </button>
                <button
                  onClick={() => handleSendQuery("Summarize concrete and steel material requirements")}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 whitespace-nowrap transition"
                >
                  🧱 Material Specs
                </button>
              </div>

              {/* Form Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSendQuery()
                }}
                className="flex gap-2 items-center"
              >
                <Input
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder={`Ask a question about ${selectedProject?.name || "this project"}...`}
                  disabled={querying || !selectedProjectId}
                  className="flex-1 text-sm bg-slate-50 focus:bg-white"
                />
                <Button
                  type="submit"
                  disabled={querying || !inputQuery.trim() || !selectedProjectId}
                  className="bg-primary hover:bg-primary/90 text-white px-5"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
