"use client"

import { useState } from "react"
import { Eye, EyeOff, Lock, Mail, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface AdminLoginProps {
  onLogin: () => void
  onBack: () => void
}

export function AdminLogin({ onLogin, onBack }: AdminLoginProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (data.success) {
        onLogin()
      } else {
        setError(data.message || "Invalid email or password. Please try again.")
      }
    } catch {
      setError("An error occurred. Please try again.")
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Back button */}
        <button
          onClick={onBack}
          className="mb-8 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </button>

        {/* Login card */}
        <div className="rounded-lg border border-border bg-card p-8 shadow-xl relative overflow-hidden">
          {/* Brand accent strip */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/30 via-primary to-primary/30" />

          <div className="mb-8 text-center space-y-2">
            <div className="mx-auto h-16 w-16 flex items-center justify-center mb-4 transition-transform hover:scale-105 duration-300">
              <img
                src="/logo2.png"
                alt="ArchStudio Logo"
                className="h-16 w-16 object-contain drop-shadow-[0_0_4px_rgba(255,255,255,0.2)]"
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Admin Access
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your credentials to access the admin panel
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email field */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="demo@archstudio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 bg-input border-border"
                  required
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-foreground"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11 bg-input border-border"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Submit button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          {/* Credentials hint */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Default credentials (set ADMIN_EMAIL & ADMIN_PASSWORD in .env.local to override):
              <br />
              <span className="font-mono text-foreground/80">
                demo@archstudio.com / demo123
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
