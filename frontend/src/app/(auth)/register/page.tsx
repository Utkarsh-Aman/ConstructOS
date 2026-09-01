"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/Card"
import { ArrowLeft } from "lucide-react"
import { authApi, companiesApi } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

export default function RegisterPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "company_admin",
    companyName: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // 1. Register User
      const registerRes = await authApi.register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: formData.role,
      })
      
      const { access_token, user } = registerRes.data
      
      // Store user token before calling companies API
      login(user, access_token)

      // 2. If company_admin, create the company
      if (formData.role === "company_admin" && formData.companyName) {
        await companiesApi.create({
          name: formData.companyName,
        })
      }

      router.push("/dashboard")
    } catch (err: any) {
      setError(err.response?.data?.detail || "An error occurred during registration.")
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
        <CardHeader className="space-y-2 text-center pb-6">
          <CardTitle className="text-3xl font-bold tracking-tight text-nav">Create an account</CardTitle>
          <CardDescription>
            Join CONCURIS and start managing your construction projects
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
              <label className="text-sm font-medium leading-none" htmlFor="name">Full Name</label>
              <Input id="name" placeholder="John Doe" required value={formData.name} onChange={handleChange} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="email">Email</label>
              <Input id="email" type="email" placeholder="m@example.com" required value={formData.email} onChange={handleChange} />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="phone">Phone Number</label>
              <Input id="phone" type="tel" placeholder="+91 9876543210" required value={formData.phone} onChange={handleChange} />
            </div>

            {formData.role === "company_admin" && (
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none" htmlFor="companyName">Company Name</label>
                <Input id="companyName" placeholder="Acme Construction" required value={formData.companyName} onChange={handleChange} />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="password">Password</label>
              <Input id="password" type="password" required value={formData.password} onChange={handleChange} />
            </div>

            <Button className="w-full mt-4" size="lg" type="submit" disabled={loading}>
              {loading ? "Signing up..." : "Sign up"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-divider/50 pt-6">
          <p className="text-sm text-foreground/70">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Log in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
