import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/Button"
import { HardHat, Bot, ShieldCheck, ArrowRight } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Background Watermark */}
      <div 
        className="fixed inset-0 pointer-events-none select-none z-0 flex items-center justify-center overflow-hidden"
        aria-hidden="true"
      >
        <Image
          src="/circular logo.png"
          alt="CONCURIS Watermark"
          width={750}
          height={750}
          className="opacity-[0.07] object-contain max-w-[85vw] max-h-[85vh]"
          priority
        />
      </div>

      <header className="h-16 sm:h-20 border-b border-divider bg-card/85 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
        <Link href="/" className="flex items-center">
          <Image
            src="/name horizontal long logo.png"
            alt="CONCURIS Logo"
            width={160}
            height={40}
            className="h-8 sm:h-10 w-auto object-contain"
            priority
          />
        </Link>
        <nav className="hidden md:flex gap-6 text-sm font-medium text-foreground/80">
          <Link href="#features" className="hover:text-primary transition">Features</Link>
          <Link href="/verify" className="hover:text-primary transition">Verify Quotation</Link>
          <Link href="/chat" className="hover:text-primary transition">Public AI Chat</Link>
        </nav>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-xs sm:text-sm px-2.5 sm:px-4">Log in</Button>
          </Link>
          <Link href="/register">
            <Button size="sm" className="text-xs sm:text-sm px-3 sm:px-4">Get Started</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-16 sm:py-24 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-6">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Next-Gen AI Construction Operating System
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-nav max-w-4xl leading-[1.15]">
          Modernizing Construction <span className="text-primary">Management</span>
        </h1>
        <p className="mt-4 sm:mt-6 text-base sm:text-xl text-foreground/70 max-w-2xl px-2">
          CONCURIS provides an AI-driven platform for seamless project management, 
          resource allocation, and vendor collaboration in the construction industry.
        </p>
        
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto px-4 max-w-sm sm:max-w-none">
          <Link href="/register" className="w-full sm:w-auto">
            <Button size="lg" className="h-12 w-full px-8 text-base shadow-md">
              Start Building <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/chat" className="w-full sm:w-auto">
            <Button size="lg" variant="outline" className="h-12 w-full px-8 text-base bg-white/60 backdrop-blur-xs">
              Chat with AI Assistant <Bot className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>

        <div id="features" className="mt-20 sm:mt-32 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl w-full text-left">
          <div className="bg-card/90 backdrop-blur-sm p-6 sm:p-8 rounded-2xl border border-divider shadow-xs flex flex-col items-center sm:items-start text-center sm:text-left">
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5">
              <HardHat className="h-6 w-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-2">Project Oversight</h3>
            <p className="text-foreground/70 text-sm leading-relaxed">
              Manage your workforce, materials, and dispatch workflows all in one unified dashboard.
            </p>
          </div>
          <div className="bg-card/90 backdrop-blur-sm p-6 sm:p-8 rounded-2xl border border-divider shadow-xs flex flex-col items-center sm:items-start text-center sm:text-left">
            <div className="h-12 w-12 rounded-xl bg-success/10 text-success flex items-center justify-center mb-5">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-2">Quotation Verification</h3>
            <p className="text-foreground/70 text-sm leading-relaxed">
              Our unique public portal allows instant verification of vendor quotations for absolute transparency.
            </p>
          </div>
          <div className="bg-card/90 backdrop-blur-sm p-6 sm:p-8 rounded-2xl border border-divider shadow-xs flex flex-col items-center sm:items-start text-center sm:text-left">
            <div className="h-12 w-12 rounded-xl bg-nav/10 text-nav flex items-center justify-center mb-5">
              <Bot className="h-6 w-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-2">AI-Powered Insights</h3>
            <p className="text-foreground/70 text-sm leading-relaxed">
              Use natural language to query construction guidelines, safety regulations, and project status.
            </p>
          </div>
        </div>
      </main>

      <footer className="py-6 sm:py-8 text-center text-xs sm:text-sm text-foreground/50 border-t border-divider relative z-10 bg-background/80 backdrop-blur-sm px-4">
        &copy; {new Date().getFullYear()} CONCURIS Construction Management. All rights reserved.
      </footer>
    </div>
  )
}
