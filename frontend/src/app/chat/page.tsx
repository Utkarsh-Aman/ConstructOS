"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Bot, User, ArrowLeft, Send, Loader2 } from "lucide-react"
import { publicApi } from "@/lib/api"
import { MarkdownContent } from "@/components/ui/MarkdownContent"

type Source = {
  id: string
  document_title: string
  chunk_text: string
}

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  sources?: Source[]
  grounded?: boolean
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I'm the CONCURIS AI Assistant. I can help you with public information regarding construction projects, government regulations, or general inquiries about our platform. How can I assist you today?",
    }
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [chatSessionId, setChatSessionId] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Initialize anonymous session on mount
    const initSession = async () => {
      try {
        await publicApi.initSession()
        console.log("Anonymous session initialized")
      } catch (err) {
        console.error("Failed to initialize session", err)
      }
    }
    initSession()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || isLoading) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    }

    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setIsLoading(true)

    try {
      const res = await publicApi.chat({
        content: userMsg.content,
        chat_session_id: chatSessionId,
      })
      
      const { answer, sources, grounded, chat_session_id } = res.data
      
      if (!chatSessionId && chat_session_id) {
        setChatSessionId(chat_session_id)
      }

      const asstMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: answer,
        sources,
        grounded,
      }

      setMessages((prev) => [...prev, asstMsg])
    } catch (err: any) {
      console.error("Chat error:", err)
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: err.response?.data?.detail || "Sorry, I encountered an error. Please try again later.",
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-16 border-b border-divider bg-card px-6 flex items-center justify-between shadow-sm z-10 shrink-0">
        <div className="flex items-center">
          <Link href="/" className="mr-4 text-foreground/50 hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-nav text-white flex items-center justify-center">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-nav leading-none">CONCURIS AI Assistant</h1>
              <p className="text-xs text-success font-medium">Online</p>
            </div>
          </div>
        </div>
        <Link href="/login">
          <Button variant="outline" size="sm">Admin Login</Button>
        </Link>
      </header>

      <main className="flex-1 overflow-y-auto p-6 flex flex-col items-center w-full">
        <div className="w-full max-w-4xl flex flex-col space-y-6">
          <div className="flex justify-center my-4">
            <span className="px-3 py-1 bg-slate-200 text-slate-500 rounded-full text-xs font-medium">Today</span>
          </div>

          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex gap-4 max-w-[80%] ${msg.role === 'user' ? 'ml-auto justify-end' : ''}`}
            >
              {msg.role === 'assistant' && (
                <div className="h-8 w-8 rounded-full bg-nav text-white flex-shrink-0 flex items-center justify-center mt-1">
                  <Bot className="h-5 w-5" />
                </div>
              )}
              
              <div className="flex flex-col gap-2">
                <div className={`p-4 shadow-sm text-sm ${
                  msg.role === 'user' 
                    ? 'bg-primary text-white rounded-2xl rounded-tr-sm' 
                    : 'bg-card border border-divider rounded-2xl rounded-tl-sm text-slate-800'
                }`}>
                  {msg.role === 'user' ? (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  ) : (
                    <MarkdownContent content={msg.content} />
                  )}
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="h-8 w-8 rounded-full bg-slate-300 text-slate-600 flex-shrink-0 flex items-center justify-center mt-1">
                  <User className="h-5 w-5" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-4 max-w-[80%]">
              <div className="h-8 w-8 rounded-full bg-nav text-white flex-shrink-0 flex items-center justify-center mt-1">
                <Bot className="h-5 w-5" />
              </div>
              <div className="bg-card border border-divider p-4 rounded-2xl rounded-tl-sm shadow-sm text-sm flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-slate-500">Thinking...</span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="p-4 bg-card border-t border-divider shrink-0">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-2">
          <Input 
            placeholder="Type your message here..." 
            className="flex-1 rounded-full border-slate-300 focus-visible:ring-primary/50"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            size="icon" 
            className="rounded-full flex-shrink-0 h-10 w-10 cursor-pointer"
            disabled={!input.trim() || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <p className="text-center text-[10px] text-slate-400 mt-2">
          Answers are generated from available sources and may be incomplete — not a substitute for professional advice.
        </p>
      </footer>
    </div>
  )
}
