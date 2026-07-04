"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import Spline from '@splinetool/react-spline'
import { Award, ShieldCheck, Download, X, Loader2, CheckCircle2 } from "lucide-react"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"

interface LandingPageProps {
  onStudentLogin: () => void
  onAdminLogin: () => void
}

export function LandingPage({ onStudentLogin, onAdminLogin }: LandingPageProps) {
  const [splineLoaded, setSplineLoaded] = useState(false)
  const [verifyId, setVerifyId] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<any | null>(null)

  useEffect(() => {
    // Smooth rotate spline bg on scroll
    const bg = document.getElementById("spline-bg")
    const handleScroll = () => {
      if (bg) {
        bg.style.transform = `rotate(${window.scrollY * 0.05}deg)`
      }
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    
    // Check for verify query param on load
    const params = new URLSearchParams(window.location.search)
    const verifyParam = params.get("verify")
    if (verifyParam) {
      setVerifyId(verifyParam)
      triggerVerification(verifyParam)
    }

    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const triggerVerification = async (certId: string) => {
    if (!db) return
    setVerifying(true)
    try {
      const docId = certId.trim().replace(/\//g, "-")
      const certRef = doc(db, "certificates", docId)
      const certSnap = await getDoc(certRef)
      
      if (certSnap.exists()) {
        const data = certSnap.data()
        setVerificationResult({
          valid: true,
          studentName: data.studentName,
          courseName: data.courseName,
          duration: data.duration,
          issuedAt: data.issuedAt,
          certificateId: data.certificateId,
          registrationNo: data.registrationNo,
        })
      } else {
        setVerificationResult({
          valid: false,
          message: "No certificate record found matching this Certificate ID.",
        })
      }
    } catch (e) {
      console.error(e)
      setVerificationResult({
        valid: false,
        message: "An error occurred during certificate verification. Please try again.",
      })
    } finally {
      setVerifying(false)
    }
  }

  const handleCloseVerification = () => {
    setVerifyId(null)
    setVerificationResult(null)
    // Clear URL search params
    const url = new URL(window.location.href)
    url.searchParams.delete("verify")
    window.history.replaceState({}, document.title, url.toString())
  }

  return (
    <div className="relative min-h-screen bg-background overflow-hidden selection:bg-primary selection:text-primary-foreground font-sans">
      
      {/* ─── Grid & Blueprint Overlay Effects ─── */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-[0.4] z-[1] pointer-events-none" />
      
      <div className="absolute inset-0 z-[1] pointer-events-none flex items-center justify-center">
        {/* Subtle glowing circular backgrounds */}
        <div className="absolute w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] -translate-x-[20%] -translate-y-[10%]" />
        <div className="absolute w-[500px] h-[500px] rounded-full bg-primary/5 blur-[100px] translate-x-[30%] translate-y-[20%]" />
        
        {/* Concentric blueprint reference circles */}
        <div className="absolute w-[800px] h-[800px] rounded-full border border-primary/[0.03] animate-[spin_120s_linear_infinite]" />
        <div className="absolute w-[500px] h-[500px] rounded-full border border-dashed border-primary/[0.02] animate-[spin_80s_linear_infinite_reverse]" />
        
        {/* Axis markers */}
        <div className="absolute w-screen h-px bg-primary/[0.03]" />
        <div className="absolute h-screen w-px bg-primary/[0.03]" />

        {/* Blueprint coordinate numbers */}
        <div className="absolute left-[calc(50%+4rem)] top-4 text-[9px] font-mono text-muted-foreground/30 select-none">X:128.00</div>
        <div className="absolute left-4 top-[calc(50%+4rem)] text-[9px] font-mono text-muted-foreground/30 select-none">Y:440.00</div>
        
        <div className="absolute right-12 top-28 font-mono text-[9px] text-muted-foreground/20 text-right select-none space-y-1">
          <div>SCALE: 1.0</div>
          <div>UNITS: MM</div>
          <div>BGEIM_PORTAL</div>
        </div>

        {/* Crosshair markers */}
        <div className="absolute top-24 left-1/2 -translate-x-1/2 w-4 h-4 flex items-center justify-center text-primary/[0.1] font-mono text-[8px] select-none">+</div>
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-4 h-4 flex items-center justify-center text-primary/[0.1] font-mono text-[8px] select-none">+</div>
        
        {/* Horizontal scan line segments */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="absolute left-[15%] right-[15%] h-[1px] bg-primary/[0.015]"
            style={{ top: `${20 + i * 20}%` }}
          />
        ))}
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
                alt="Baderia Global Logo"
                className="relative h-24 w-24 object-contain transition-transform duration-500 hover:scale-105"
              />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary mb-4">
              <Award className="h-4 w-4" />
              <span className="text-sm font-medium tracking-wide uppercase">Offline Course Completion</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight text-foreground leading-tight text-balance">
              Baderia Global
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
              <p className="text-muted-foreground">Premium completion certificates validating your skills.</p>
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
            © {new Date().getFullYear()} Baderia Global. All rights reserved.
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

      {/* ── Certificate Verification Modal ── */}
      {verifyId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={handleCloseVerification} />
          <div className="relative bg-card border border-border rounded-lg w-full max-w-lg p-8 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Crimson banner line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary" />
            
            <button onClick={handleCloseVerification} className="absolute right-4 top-4 p-2 rounded-md hover:bg-secondary transition-colors">
              <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
            </button>

            {verifying ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground font-medium">Verifying certificate credentials...</p>
              </div>
            ) : verificationResult ? (
              <div className="space-y-6">
                {verificationResult.valid ? (
                  <>
                    <div className="text-center space-y-2">
                      <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                        <CheckCircle2 className="h-10 w-10" />
                      </div>
                      <h2 className="text-2xl font-bold text-foreground">Certificate Verified</h2>
                      <p className="text-sm text-muted-foreground">This certificate is authentic and registered in our database</p>
                    </div>

                    <div className="border border-border/50 rounded-lg p-5 bg-secondary/30 space-y-4">
                      <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recipient Name</p>
                          <p className="font-semibold text-foreground mt-0.5">{verificationResult.studentName}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Course Completed</p>
                          <p className="font-semibold text-foreground mt-0.5">{verificationResult.courseName}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Course Duration</p>
                          <p className="font-semibold text-foreground mt-0.5">{verificationResult.duration || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date of Completion</p>
                          <p className="font-semibold text-foreground mt-0.5">{verificationResult.issuedAt}</p>
                        </div>
                        <div className="col-span-2 pt-2 border-t border-border/50">
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Certificate Number</p>
                          <p className="font-mono text-primary font-bold mt-0.5">{verificationResult.certificateId}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Registration ID</p>
                          <p className="font-mono text-muted-foreground mt-0.5">{verificationResult.registrationNo}</p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center space-y-4 py-6">
                    <div className="mx-auto h-16 w-16 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
                      <X className="h-10 w-10" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">Verification Failed</h2>
                    <p className="text-muted-foreground">{verificationResult.message}</p>
                  </div>
                )}

                <div className="pt-2">
                  <Button onClick={handleCloseVerification} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    Close Verification
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
