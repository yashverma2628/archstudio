"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import Spline from '@splinetool/react-spline'
import { Award, ShieldCheck, Download } from "lucide-react"

interface LandingPageProps {
  onStudentLogin: () => void
  onAdminLogin: () => void
}

export function LandingPage({ onStudentLogin, onAdminLogin }: LandingPageProps) {
  const [splineLoaded, setSplineLoaded] = useState(false)

  useEffect(() => {
    const bg = document.getElementById("spline-bg")
    const handleScroll = () => {
      if (bg) {
        bg.style.transform = `rotate(${window.scrollY * 0.05}deg)`
      }
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-transparent relative overflow-hidden">

      {/* ─── Architectural Blueprint Grid Background ─── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Minor grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(180,220,180,0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(180,220,180,0.5) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
          }}
        />
        {/* Major grid */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(180,220,180,0.7) 1px, transparent 1px),
              linear-gradient(90deg, rgba(180,220,180,0.7) 1px, transparent 1px)
            `,
            backgroundSize: '100px 100px',
          }}
        />
        {/* Crosshair - center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] pointer-events-none opacity-[0.06]">
          <div className="absolute top-1/2 left-0 w-full h-px bg-primary" />
          <div className="absolute left-1/2 top-0 h-full w-px bg-primary" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-primary" />
        </div>
        {/* Radial fade mask */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 70% 60% at 50% 45%, transparent 40%, var(--background) 100%)',
          }}
        />
      </div>

      {/* ─── Technical Annotation Labels ─── */}
      <div className="fixed inset-0 z-[1] pointer-events-none select-none overflow-hidden">
        {/* Top-left: project reference */}
        <div className="absolute top-20 left-6 flex flex-col gap-1 opacity-[0.12]">
          <span className="text-[10px] font-mono tracking-[0.3em] text-primary uppercase">PROJ: ARCH-STUDIO</span>
          <span className="text-[9px] font-mono tracking-[0.2em] text-primary/70">REV 04 — 2025.06</span>
          <span className="text-[9px] font-mono tracking-[0.2em] text-primary/70">SHEET 01 OF 01</span>
        </div>
        {/* Top-right: scale + grid ref */}
        <div className="absolute top-20 right-6 flex flex-col items-end gap-1 opacity-[0.12]">
          <span className="text-[10px] font-mono tracking-[0.3em] text-primary uppercase">SCALE 1:50 @ A3</span>
          <span className="text-[9px] font-mono tracking-[0.2em] text-primary/70">GRID AXIS REF: AR-01</span>
        </div>
        {/* Bottom-left: axis label */}
        <div className="absolute bottom-8 left-6 flex items-center gap-3 opacity-[0.10]">
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-px h-10 bg-primary/50" />
            <span className="text-[8px] font-mono text-primary/70 tracking-widest">Y</span>
          </div>
          <div className="flex items-center gap-0.5">
            <div className="h-px w-10 bg-primary/50" />
            <span className="text-[8px] font-mono text-primary/70 tracking-widest">X</span>
          </div>
        </div>
        {/* Bottom-right: projection note */}
        <div className="absolute bottom-8 right-6 opacity-[0.10]">
          <span className="text-[9px] font-mono tracking-[0.2em] text-primary/70 uppercase">Z-Axis Projection — Orthographic</span>
        </div>
        {/* Left edge tick marks */}
        <div className="absolute left-0 top-0 h-full w-6 flex flex-col justify-between py-24 opacity-[0.06]">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={`ltick-${i}`} className="flex items-center">
              <div className="w-3 h-px bg-primary" />
              <span className="text-[7px] font-mono text-primary/60 ml-0.5">{i}</span>
            </div>
          ))}
        </div>
        {/* Top edge tick marks */}
        <div className="absolute top-16 left-0 w-full h-4 flex justify-between px-8 opacity-[0.06]">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={`ttick-${i}`} className="flex flex-col items-center">
              <div className="h-2 w-px bg-primary" />
              <span className="text-[7px] font-mono text-primary/60 mt-0.5">{String.fromCharCode(65 + i)}</span>
            </div>
          ))}
        </div>

        {/* Animated horizontal scan-line */}
        <div
          className="absolute left-0 w-full h-px opacity-[0.08]"
          style={{
            background: 'linear-gradient(90deg, transparent, var(--primary), transparent)',
            animation: 'blueprintScan 8s ease-in-out infinite',
          }}
        />
      </div>

      {/* ─── 3D Canvas Background (Spline) ─── */}
      <div
        id="spline-bg"
        className="fixed inset-0 z-[2] pointer-events-none transition-transform duration-75 ease-linear flex items-center justify-center overflow-hidden w-full h-full"
        style={{
          transform: "rotate(0deg)",
          opacity: splineLoaded ? 0.5 : 0,
          transition: 'opacity 1.5s ease-out, transform 75ms linear',
          filter: 'hue-rotate(15deg) saturate(0.7) brightness(0.85)',
          mixBlendMode: 'screen',
        }}
      >
        <div className="absolute w-full h-full scale-[3] sm:scale-[2] md:scale-[1.2] origin-center translate-x-0 md:translate-x-[12%]">
          <Spline
            scene="https://prod.spline.design/xT6cvvtM0P9Pr-qK/scene.splinecode"
            onLoad={() => setSplineLoaded(true)}
          />
        </div>
      </div>

      {/* ─── Corner Brackets (drafting frame) ─── */}
      <div className="fixed inset-0 z-[3] pointer-events-none">
        {/* Top-left bracket */}
        <div className="absolute top-24 left-8 w-12 h-12 border-t border-l border-primary/[0.08] rounded-tl-sm" />
        {/* Top-right bracket */}
        <div className="absolute top-24 right-8 w-12 h-12 border-t border-r border-primary/[0.08] rounded-tr-sm" />
        {/* Bottom-left bracket */}
        <div className="absolute bottom-12 left-8 w-12 h-12 border-b border-l border-primary/[0.08] rounded-bl-sm" />
        {/* Bottom-right bracket */}
        <div className="absolute bottom-12 right-8 w-12 h-12 border-b border-r border-primary/[0.08] rounded-br-sm" />
      </div>

      {/* ─── Hero Section ─── */}
      <section className="relative z-20 min-h-[90vh] flex items-center pt-20 pb-16">
        <div className="mx-auto w-full max-w-4xl px-6 text-center">
          <div className="space-y-8 flex flex-col items-center">

            <div className="relative group mb-2 animate-in fade-in zoom-in duration-1000">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-primary/40 rounded-full blur-md opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
              <img
                src="/logo2.png"
                alt="ArchStudio Logo"
                className="relative h-24 w-24 object-contain transition-transform duration-500 hover:scale-105 drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]"
              />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary mb-4">
              <Award className="h-4 w-4" />
              <span className="text-sm font-medium tracking-wide uppercase">Offline Course Completion</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight text-foreground leading-tight text-balance">
              ARCH STUDIO
              <br />
              <span className="text-primary">Certificate Portal</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              Access and download your premium certificates for offline architectural design courses. Log in with the credentials provided by your instructor.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-8">
              <Button
                onClick={onStudentLogin}
                className="h-14 px-8 text-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium w-full sm:w-auto shadow-lg shadow-primary/20 transition-all hover:scale-105"
              >
                Student Login
              </Button>
              <Button
                onClick={onAdminLogin}
                variant="outline"
                className="h-14 px-8 text-lg border-border text-foreground hover:bg-secondary font-medium w-full sm:w-auto backdrop-blur-md bg-background/50 transition-all hover:scale-105"
              >
                Admin Access
              </Button>
            </div>

          </div>
        </div>
      </section>

      {/* ─── Features Section ─── */}
      <section className="relative z-20 py-24 border-t border-border/50 bg-background/60 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="space-y-4 flex flex-col items-center p-6 rounded-2xl bg-card/30 border border-border/50 hover:border-primary/30 transition-colors">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">Verified Certificates</h3>
              <p className="text-muted-foreground">Authentic, digitally verifiable certificates for your professional portfolio.</p>
            </div>
            <div className="space-y-4 flex flex-col items-center p-6 rounded-2xl bg-card/30 border border-border/50 hover:border-primary/30 transition-colors">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Award className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">Industry Recognized</h3>
              <p className="text-muted-foreground">Premium completion certificates validating your architectural design skills.</p>
            </div>
            <div className="space-y-4 flex flex-col items-center p-6 rounded-2xl bg-card/30 border border-border/50 hover:border-primary/30 transition-colors">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Download className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">Instant Download</h3>
              <p className="text-muted-foreground">Access and download your certificates anytime, anywhere.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="relative z-20 py-8 border-t border-border/50 bg-background/80 backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-center justify-between px-6 md:px-32 gap-6 w-full max-w-7xl mx-auto">
          <p className="text-sm text-muted-foreground text-center md:text-left">
            © {new Date().getFullYear()} ArchStudio. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6">
            <span className="text-muted-foreground text-lg md:text-xl font-serif italic tracking-wide flex items-baseline gap-1.5">
              Creation <span className="text-xl md:text-2xl">&</span> Collaboration
            </span>
            <div className="flex items-center gap-4">
              <a href="https://yashverma2628.github.io/yashkecode/" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity flex items-center">
                <img src="/yashlogo.png" alt="YashKaCode Logo" className="h-8 md:h-10 w-auto object-contain" />
              </a>
              <a href="https://lightzia.netlify.app/" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity flex items-center">
                <img src="/logolight.png" alt="LightZia Logo" className="h-6 md:h-8 w-auto object-contain -translate-y-[2px]" />
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* ─── Blueprint Scan-line Keyframe ─── */}
      <style jsx>{`
        @keyframes blueprintScan {
          0%, 100% { top: 10%; }
          50% { top: 90%; }
        }
      `}</style>
    </div>
  )
}
