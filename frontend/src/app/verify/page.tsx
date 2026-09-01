import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { ShieldCheck, ArrowLeft, Search } from "lucide-react"

export default function VerifyPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-16 border-b border-divider bg-card px-8 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl text-nav tracking-tight flex items-center">
          <ArrowLeft className="mr-4 h-4 w-4 text-slate-500" /> CONCURIS
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-xl border-primary/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ShieldCheck className="w-32 h-32 text-primary" />
          </div>
          <CardHeader className="space-y-2 pb-8 relative z-10">
            <div className="w-12 h-12 bg-success/10 text-success rounded-full flex items-center justify-center mb-4 border border-success/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-bold text-nav">Verify Quotation</CardTitle>
            <CardDescription className="text-base">
              Enter the Quotation ID or Verification Hash to confirm the authenticity and status of a vendor quotation.
            </CardDescription>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="flex space-x-2">
              <Input 
                placeholder="e.g. QOT-2026-8A9X..." 
                className="flex-1"
              />
              <Button>
                <Search className="mr-2 h-4 w-4" /> Verify
              </Button>
            </div>
            <p className="text-xs text-foreground/50 mt-4 text-center">
              This is a public portal designed to ensure absolute transparency in procurement.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
