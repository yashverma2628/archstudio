"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { LandingPage } from "@/components/landing-page"
import { AdminLogin } from "@/components/admin-login"
import dynamic from "next/dynamic"
import { cn } from "@/lib/utils"

const AdminDashboard = dynamic(
  () => import("@/components/admin-dashboard").then((mod) => mod.AdminDashboard),
  { ssr: false }
)

const StudentPortal = dynamic(
  () => import("@/components/student-portal").then((mod) => mod.StudentPortal),
  { ssr: false }
)

type View = "home" | "admin" | "admin-login" | "student"

export default function Home() {
  const [currentView, setCurrentView] = useState<View>("home")
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)

  const handleStudentLogin = () => {
    setCurrentView("student")
  }

  const handleAdminLogin = () => {
    if (isAdminAuthenticated) {
      setCurrentView("admin")
    } else {
      setCurrentView("admin-login")
    }
  }

  const handleAdminAuthenticated = () => {
    setIsAdminAuthenticated(true)
    setCurrentView("admin")
  }

  const handleViewChange = (view: View) => {
    // If trying to access admin and not authenticated, show login
    if (view === "admin" && !isAdminAuthenticated) {
      setCurrentView("admin-login")
    } else {
      setCurrentView(view)
    }
  }

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false)
    setCurrentView("home")
  }

  const isDashboardView = currentView === "admin" || currentView === "student"

  return (
    <div className="min-h-screen bg-background">
      {!isDashboardView && (
        <Navigation 
          currentView={currentView === "admin-login" ? "admin" : currentView} 
          onViewChange={handleViewChange}
          isAdminAuthenticated={isAdminAuthenticated}
          onAdminLogout={handleAdminLogout}
        />
      )}

      <main className={cn(!isDashboardView && "pt-16")}>
        {currentView === "home" && (
          <LandingPage
            onStudentLogin={handleStudentLogin}
            onAdminLogin={handleAdminLogin}
          />
        )}

        {currentView === "admin-login" && (
          <AdminLogin
            onLogin={handleAdminAuthenticated}
            onBack={() => setCurrentView("home")}
          />
        )}

        {currentView === "admin" && isAdminAuthenticated && (
          <AdminDashboard onLogout={handleAdminLogout} />
        )}

        {currentView === "student" && <StudentPortal onLogout={() => setCurrentView("home")} />}
      </main>
    </div>
  )
}
