"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/Card"
import { ArrowLeft } from "lucide-react"
import { authApi } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

import Image from "next/image"

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "company_admin",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await authApi.login({
        email: formData.email,
        password: formData.password,
        role: formData.role,
      })
      
      const { access_token, user } = res.data
      login(user, access_token)
      router.push("/dashboard")
    } catch (err: any) {
      setError(err.response?.data?.detail || "Invalid credentials or role mismatch.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <Link href="/" className="absolute top-8 left-8 flex items-center text-sm font-medium text-foreground/70 hover:text-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to home
      </Link>
      
      <Card className="w-full max-w-md shadow-lg border-divider">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="flex justify-center mb-1">
            <Image
              src="/circular logo.png"
              alt="CONCURIS Logo"
              width={64}
              height={64}
              className="rounded-full shadow-md object-contain"
              priority
            />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-nav">Welcome back</CardTitle>
          <CardDescription>
            Enter your credentials to access your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-600 rounded text-sm">
              {error}
            </div>
          )}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">I am a</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "company_admin", label: "Company Admin" },
                  { id: "site_manager", label: "Site Manager" },
                  { id: "vendor", label: "Vendor" },
                  { id: "worker", label: "Worker" },
                  { id: "group_leader", label: "Group Leader" },
                  { id: "driver", label: "Driver" },
                ].map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, role: r.id })}
                    className={cn(
                      "px-3 py-2 text-sm rounded-md border text-center transition-colors cursor-pointer",
                      formData.role === r.id
                        ? "bg-primary text-white border-primary font-medium"
                        : "border-divider bg-transparent text-foreground hover:bg-card"
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="email">Email</label>
              <Input id="email" type="email" placeholder="m@example.com" required value={formData.email} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium leading-none" htmlFor="password">Password</label>
                <Link href="#" className="text-sm text-primary hover:underline">Forgot password?</Link>
              </div>
              <Input id="password" type="password" required value={formData.password} onChange={handleChange} />
            </div>
            <Button className="w-full mt-4" size="lg" type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Log in"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-divider/50 pt-6">
          <p className="text-sm text-foreground/70">
            Don't have an account?{" "}
            <Link href="/register" className="font-semibold text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
