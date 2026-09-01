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
          className="opacity-[0.09] object-contain max-w-[80vw] max-h-[80vh]"
          priority
        />
      </div>

      <header className="h-20 border-b border-divider bg-card/85 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-30">
        <Link href="/" className="flex items-center">
          <Image
            src="/name horizontal long logo.png"
            alt="CONCURIS Logo"
            width={170}
            height={42}
            className="h-10 w-auto object-contain"
            priority
          />
        </Link>
        <nav className="hidden md:flex gap-6 text-sm font-medium text-foreground/80">
          <Link href="#features" className="hover:text-primary transition">Features</Link>
          <Link href="#about" className="hover:text-primary transition">About</Link>
          <Link href="/verify" className="hover:text-primary transition">Verify Quotation</Link>
        </nav>
        <div className="flex gap-4">
          <Link href="/login">
            <Button variant="ghost">Log in</Button>
          </Link>
          <Link href="/register">
            <Button>Get Started</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-24 text-center relative z-10">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-nav max-w-4xl">
          Modernizing Construction <span className="text-primary">Management</span>
        </h1>
        <p className="mt-6 text-xl text-foreground/70 max-w-2xl">
          CONCURIS provides an AI-driven platform for seamless project management, 
          resource allocation, and vendor collaboration in the construction industry.
        </p>
        
        <div className="mt-10 flex gap-4">
          <Link href="/register">
            <Button size="lg" className="h-12 px-8 text-base">
              Start Building <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/chat">
            <Button size="lg" variant="outline" className="h-12 px-8 text-base">
              Chat with AI Assistant <Bot className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>

        <div id="features" className="mt-32 grid md:grid-cols-3 gap-8 max-w-6xl w-full">
          <div className="bg-card/90 backdrop-blur-sm p-8 rounded-2xl border border-divider shadow-sm flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-6">
              <HardHat className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold mb-3">Project Oversight</h3>
            <p className="text-foreground/70 text-sm">
              Manage your workforce, materials, and dispatch workflows all in one unified dashboard.
            </p>
          </div>
          <div className="bg-card/90 backdrop-blur-sm p-8 rounded-2xl border border-divider shadow-sm flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-full bg-success/10 text-success flex items-center justify-center mb-6">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold mb-3">Quotation Verification</h3>
            <p className="text-foreground/70 text-sm">
              Our unique public portal allows instant verification of vendor quotations for absolute transparency.
            </p>
          </div>
          <div className="bg-card/90 backdrop-blur-sm p-8 rounded-2xl border border-divider shadow-sm flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-full bg-nav/10 text-nav flex items-center justify-center mb-6">
              <Bot className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold mb-3">AI-Powered Insights</h3>
            <p className="text-foreground/70 text-sm">
              Use natural language to query construction guidelines, safety regulations, and project status.
            </p>
          </div>
        </div>
      </main>

      <footer className="py-8 text-center text-sm text-foreground/50 border-t border-divider relative z-10 bg-background/80 backdrop-blur-sm">
        &copy; {new Date().getFullYear()} CONCURIS Construction Management. All rights reserved.
      </footer>
    </div>
  )
}
