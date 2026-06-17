"use client"

import { useState } from "react"
import { Phone, Award, Clock, Download, Sparkles, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { db, auth } from "@/lib/firebase"
import { signInWithEmailAndPassword, signOut } from "firebase/auth"
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore"

interface StudentCourse {
  id: string
  courseId: string
  title: string
  description: string
  duration?: string
  completed: boolean
  completedAt?: string
  certificateUrl?: string
}

export function StudentPortal() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isVerified, setIsVerified] = useState(false)
  const [studentName, setStudentName] = useState("")
  const [courses, setCourses] = useState<StudentCourse[]>([])
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  // Force-download a certificate via the Cloudinary fl_attachment transformation
  const handleDownload = async (url: string, courseTitle: string, enrollmentId: string) => {
    setDownloadingId(enrollmentId)
    try {
      // Fix legacy Cloudinary certificates that don't have the .pdf extension
      let finalUrl = url;
      if (url.includes("cloudinary.com") && !url.endsWith(".pdf")) {
        finalUrl = `${url}.pdf`;
      }

      // Use Cloudinary fl_attachment flag to force download (works cross-origin)
      const downloadUrl = finalUrl.includes("cloudinary.com")
        ? finalUrl.replace("/upload/", "/upload/fl_attachment/")
        : finalUrl

      // Try fetch + blob first (cleanest approach)
      const response = await fetch(downloadUrl)
      if (response.ok) {
        const blob = await response.blob()
        const blobUrl = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = blobUrl
        a.download = `${courseTitle.replace(/\s+/g, "_")}_Certificate.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(blobUrl)
      } else {
        // Fallback: open the fl_attachment URL in same tab (forces browser download)
        window.location.href = downloadUrl
      }
    } catch {
      // CORS blocked — open directly, browser will download because of fl_attachment
      const downloadUrl = url.includes("cloudinary.com")
        ? url.replace("/upload/", "/upload/fl_attachment/")
        : url
      window.location.href = downloadUrl
    }
    setDownloadingId(null)
  }

  const handleVerify = async () => {
    setError("")
    setIsLoading(true)

    try {
      if (!db || !auth) {
        setError("Firebase is not configured. Please contact support.")
        setIsLoading(false)
        return
      }

      // 1. Authenticate with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password)
      const user = userCredential.user

      // 2. Query students by email or uid
      let studentsQ = query(collection(db, "students"), where("uid", "==", user.uid))
      let studentsSnap = await getDocs(studentsQ)

      // Fallback to email if uid isn't set (for some reason)
      if (studentsSnap.empty) {
        studentsQ = query(collection(db, "students"), where("email", "==", email.trim()))
        studentsSnap = await getDocs(studentsQ)
      }

      if (studentsSnap.empty) {
        setError("No student record found for this account. Please contact support.")
        // Optionally sign out the user if no record is found
        await signOut(auth)
        setIsLoading(false)
        return
      }

      // Use the first matching student (phone should be unique)
      const studentDoc = studentsSnap.docs[0]
      const studentData = studentDoc.data()
      const foundName = studentData.name as string

      // Gather all enrollments for this student (could be multiple docs if enrolled in many courses)
      const allStudentDocs = studentsSnap.docs

      // Fetch course details for each enrollment
      const courseEntries: StudentCourse[] = []
      for (const sDoc of allStudentDocs) {
        const sData = sDoc.data()
        const courseId = sData.courseId as string
        if (!courseId) continue

        // Fetch course details
        const courseRef = doc(db, "courses", courseId)
        const courseSnap = await getDoc(courseRef)
        const courseData = courseSnap.exists() ? courseSnap.data() : null

        courseEntries.push({
          id: sDoc.id,
          courseId,
          title: sData.courseName || courseData?.title || "Unknown Course",
          description: courseData?.description || "",
          duration: courseData?.duration || "",
          completed: Boolean(sData.completed),
          completedAt: sData.completedAt || undefined,
          certificateUrl: sData.certificateUrl || undefined,
        })
      }

      setStudentName(foundName)
      setCourses(courseEntries)
      setIsVerified(true)
    } catch (err) {
      console.error("Verification error:", err)
      setError("Something went wrong. Please try again.")
    }

    setIsLoading(false)
  }

  const handleLogout = async () => {
    try {
      if (auth) await signOut(auth)
    } catch (e) {
      console.error(e)
    }
    setIsVerified(false)
    setEmail("")
    setPassword("")
    setStudentName("")
    setCourses([])
    setError("")
  }

  // ─── Verification Screen ────────────────────────────────────────────────────
  if (!isVerified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="relative rounded-lg border border-border bg-card p-8 shadow-2xl">
            {/* Decorative corner accents */}
            <div className="absolute top-0 left-0 h-8 w-8 border-t-2 border-l-2 border-primary rounded-tl-lg" />
            <div className="absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2 border-primary rounded-br-lg" />

            <div className="text-center space-y-6">
              <div className="mx-auto h-16 w-16 flex items-center justify-center transition-transform hover:scale-105 duration-300">
                <img
                  src="/logo2.png"
                  alt="ArchStudio Logo"
                  className="h-16 w-16 object-contain drop-shadow-[0_0_4px_rgba(255,255,255,0.2)]"
                />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">Student Portal</h1>
                <p className="text-muted-foreground">
                  Enter your registered phone number to access your courses and certificates
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 text-center text-lg bg-input border-border"
                  />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && email && password && handleVerify()}
                    className="h-12 text-center text-lg bg-input border-border"
                  />
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </div>

                <Button
                  onClick={handleVerify}
                  disabled={!email || !password || isLoading}
                  className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Authenticating…
                    </>
                  ) : (
                    "Login & Access"
                  )}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Use the credentials provided by your instructor
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Dashboard Screen ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div className="space-y-1">
            <p className="text-sm font-medium text-primary">Welcome back</p>
            <h1 className="text-3xl font-bold text-foreground">{studentName}</h1>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-border text-foreground hover:bg-secondary"
          >
            Sign Out
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="p-4 rounded-lg border border-border bg-card">
            <p className="text-2xl font-bold text-foreground">{courses.length}</p>
            <p className="text-sm text-muted-foreground">Total Courses</p>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card">
            <p className="text-2xl font-bold text-primary">
              {courses.filter((c) => c.completed).length}
            </p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card">
            <p className="text-2xl font-bold text-foreground">
              {courses.filter((c) => !c.completed).length}
            </p>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card">
            <p className="text-2xl font-bold text-foreground">
              {courses.filter((c) => c.completed && c.certificateUrl).length}
            </p>
            <p className="text-sm text-muted-foreground">Certificates</p>
          </div>
        </div>

        {/* Section Title */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground">Your Courses</h2>
          <p className="text-muted-foreground">View your enrolled courses and download certificates</p>
        </div>

        {/* Course Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {courses.map((course) => (
            <div
              key={course.id}
              className={cn(
                "relative rounded-lg border bg-card overflow-hidden transition-all duration-300",
                course.completed
                  ? "border-primary/50 shadow-lg shadow-primary/5"
                  : "border-border"
              )}
            >
              {course.completed && (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
              )}

              <div className="p-6 space-y-4">
                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  {course.completed ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Completed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-muted-foreground text-xs font-medium">
                      <Clock className="h-3.5 w-3.5" />
                      In Progress
                    </span>
                  )}
                  <Award
                    className={cn(
                      "h-5 w-5",
                      course.completed ? "text-primary" : "text-muted-foreground/30"
                    )}
                  />
                </div>

                {/* Course Info */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">{course.title}</h3>
                  {course.description && (
                    <p className="text-sm text-muted-foreground">{course.description}</p>
                  )}
                  {course.duration && (
                    <p className="text-xs text-muted-foreground">Duration: {course.duration}</p>
                  )}
                </div>

                {/* Completion Date */}
                {course.completed && course.completedAt && (
                  <p className="text-xs text-muted-foreground">
                    Completed on {course.completedAt}
                  </p>
                )}

                {/* Action Button */}
                {course.completed ? (
                  course.certificateUrl ? (
                    <Button
                      onClick={() => handleDownload(course.certificateUrl!, course.title, course.id)}
                      disabled={downloadingId === course.id}
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 group"
                    >
                      {downloadingId === course.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2 group-hover:animate-pulse" />
                      )}
                      Download Certificate
                      <Download className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <div className="py-3 text-center rounded-md bg-primary/5 border border-primary/20">
                      <p className="text-sm text-primary font-medium">
                        Certificate being prepared…
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your instructor will upload it soon
                      </p>
                    </div>
                  )
                ) : (
                  <div className="py-3 text-center rounded-md bg-secondary/50">
                    <p className="text-sm text-muted-foreground">
                      Certificate available upon completion
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {courses.length === 0 && (
          <div className="text-center py-16">
            <Award className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Courses Yet</h3>
            <p className="text-muted-foreground">
              {"You haven't been enrolled in any courses yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
