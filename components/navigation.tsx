"use client"

import { useState } from "react"
import { LogOut, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type View = "home" | "admin" | "admin-login" | "student"

interface NavigationProps {
  currentView: View
  onViewChange: (view: View) => void
  isAdminAuthenticated?: boolean
  onAdminLogout?: () => void
}

export function Navigation({
  currentView,
  onViewChange,
  isAdminAuthenticated,
  onAdminLogout
}: NavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const navItems: { id: View; label: string }[] = [
    { id: "home", label: "Home" },
    { id: "admin", label: "Admin" },
    { id: "student", label: "Student Portal" },
  ]

  const handleNavClick = (view: View) => {
    onViewChange(view)
    setIsMenuOpen(false)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo2.png"
            alt="Arch Studio Logo"
            className="h-12 w-16 object-contain transition-transform hover:scale-110 duration-200 drop-shadow-[0_0_2px_rgba(255,255,255,0.25)]"
          />
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
            ARCH STUDIO
          </span>
        </div>

        {/* Desktop Menu */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors rounded-md",
                currentView === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              {item.label}
            </button>
          ))}

          {/* Logout button for authenticated admin */}
          {isAdminAuthenticated && onAdminLogout && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onAdminLogout()
                setIsMenuOpen(false)
              }}
              className="ml-2 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          )}
        </nav>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 md:hidden text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary transition-colors"
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="md:hidden border-b border-border bg-background px-6 py-4 space-y-2 flex flex-col shadow-lg animate-in slide-in-from-top duration-200">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={cn(
                "w-full text-left px-4 py-3 text-sm font-medium transition-colors rounded-md",
                currentView === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              {item.label}
            </button>
          ))}

          {/* Logout button for authenticated admin (Mobile) */}
          {isAdminAuthenticated && onAdminLogout && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onAdminLogout()
                setIsMenuOpen(false)
              }}
              className="w-full justify-start px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          )}
        </div>
      )}
    </header>
  )
}
