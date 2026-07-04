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
import QRCode from "qrcode"

interface StudentCourse {
  id: string
  courseId: string
  title: string
  description: string
  duration?: string
  completed: boolean
  completedAt?: string
  certificateUrl?: string
  certificateId?: string
  registrationNo?: string
  certificateTemplate?: string
  courseStartDate?: string
  courseEndDate?: string
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

  // Client-side dynamic PDF generator overlaying template with local QR code
  const handleDownload = async (course: StudentCourse, studentName: string) => {
    setDownloadingId(course.id)
    try {
      const canvas = document.createElement("canvas")
      canvas.width = 2000
      canvas.height = 1414
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Could not get canvas context")

      const img = new Image()
      img.crossOrigin = "anonymous"
      
      let templateSrc = course.certificateTemplate

      if (!templateSrc && db) {
        try {
          const globalSnap = await getDoc(doc(db, "settings", "global"))
          if (globalSnap.exists()) {
            templateSrc = globalSnap.data().certificateTemplate || null
          }
        } catch (e) {
          console.error("Error fetching global template:", e)
        }
      }

      if (!templateSrc) {
        templateSrc = "https://example.com/invalid-placeholder.jpg"
      }

      await new Promise<void>((resolve) => {
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          resolve()
        }
        img.onerror = () => {
          console.warn("Failed to load certificate template, drawing procedural template fallback.")
          ctx.fillStyle = "#FDFBF7"
          ctx.fillRect(0, 0, canvas.width, canvas.height)

          ctx.strokeStyle = "#800020"
          ctx.lineWidth = 20
          ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80)
          
          ctx.strokeStyle = "#D4AF37"
          ctx.lineWidth = 4
          ctx.strokeRect(60, 60, canvas.width - 120, canvas.height - 120)

          ctx.textAlign = "center"
          ctx.fillStyle = "#800020"
          ctx.font = "bold 90px 'Georgia', serif"
          ctx.fillText("Baderia Global", canvas.width / 2, 220)

          ctx.fillStyle = "#D4AF37"
          ctx.font = "bold tracking-widest 28px 'Inter', sans-serif"
          ctx.fillText("THE BEST INSTITUTE OF ENGINEERING & MANAGEMENT", canvas.width / 2, 290)

          ctx.fillStyle = "#111827"
          ctx.font = "bold 64px 'Georgia', serif"
          ctx.fillText("CERTIFICATE OF COMPLETION", canvas.width / 2, 450)

          resolve()
        }
        img.src = templateSrc
      })

      ctx.textBaseline = "middle"

      const textCenterX = 1280

      // Line 1: This is to Certify that
      ctx.textAlign = "center"
      ctx.font = "italic 36px 'Georgia', serif"
      ctx.fillStyle = "#374151"
      ctx.fillText("This is to Certify that", textCenterX, 570)

      // Line 2: Mr./Ms. (small black) and Participant Name (red) on same line
      ctx.font = "italic 36px 'Georgia', serif"
      const prefixWidth = ctx.measureText("Mr./Ms. ").width
      ctx.font = "bold italic 56px 'Georgia', serif"
      const nameWidth = ctx.measureText(studentName).width

      const totalWidth = prefixWidth + nameWidth
      const startX = textCenterX - totalWidth / 2

      ctx.textAlign = "left"
      ctx.font = "italic 36px 'Georgia', serif"
      ctx.fillStyle = "#374151"
      ctx.fillText("Mr./Ms. ", startX, 640)

      ctx.font = "bold italic 56px 'Georgia', serif"
      ctx.fillStyle = "#800020"
      ctx.fillText(studentName, startX + prefixWidth, 640)

      // Reset back to center alignment for other lines
      ctx.textAlign = "center"

      // Line 3: has Successfully
      ctx.font = "italic 36px 'Georgia', serif"
      ctx.fillStyle = "#374151"
      ctx.fillText("has Successfully", textCenterX, 705)

      // Line 4: Participated in [Duration] training on
      ctx.font = "italic 36px 'Georgia', serif"
      ctx.fillStyle = "#374151"
      const durLabel = course.duration ? `${course.duration} ` : ""
      ctx.fillText(`Participated in ${durLabel}training on`, textCenterX, 770)

      // Line 5: "[Course Title]"
      ctx.font = "bold 46px 'Georgia', serif"
      ctx.fillStyle = "#111827"
      ctx.fillText(`"${course.title}"`, textCenterX, 845)

      // Line 6: from [startDate] to [endDate] organised by
      ctx.font = "italic 36px 'Georgia', serif"
      ctx.fillStyle = "#374151"
      const start = course.courseStartDate || "05/02/2024"
      const end = course.courseEndDate || course.completedAt || "17/02/2024"
      ctx.fillText(`from ${start} to ${end} organised by`, textCenterX, 910)

      // Line 7: Department (shifted upward to prevent trainers signature overlap)
      ctx.font = "italic 36px 'Georgia', serif"
      ctx.fillStyle = "#374151"
      ctx.fillText("Mechanical Engineering Department.", textCenterX, 970)

      // Metadata (Bottom Left)
      ctx.textAlign = "left"
      ctx.font = "bold 22px 'Courier New', monospace"
      ctx.fillStyle = "#374151"
      const certId = course.certificateId || "BGEIM-GEN-PENDING"
      const regNo = course.registrationNo || "BGEIM-REG-PENDING"
      const dateOfIssue = course.completedAt || new Date().toLocaleDateString("en-GB")

      ctx.fillText(`Certificate No : ${certId}`, 240, 1150)
      ctx.fillText(`Registration No: ${regNo}`, 240, 1190)
      ctx.fillText(`Date of Issue  : ${dateOfIssue}`, 240, 1230)

      // Draw QR Code centered inside the white outlined box on the left banner
      const verificationUrl = `${window.location.origin}?verify=${encodeURIComponent(certId)}`
      try {
        const qrDataUrl = await QRCode.toDataURL(verificationUrl, { margin: 1, width: 220 })
        const qrImg = new Image()
        await new Promise<void>((resolve) => {
          qrImg.onload = () => {
            ctx.drawImage(qrImg, 370, 440, 190, 190)
            resolve()
          }
          qrImg.onerror = () => resolve()
          qrImg.src = qrDataUrl
        })
      } catch (e) {
        console.error("QR Code generator failed:", e)
      }

      // Generate and save PDF using jsPDF
      const { jsPDF } = await import("jspdf")
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [canvas.width, canvas.height]
      })

      pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, canvas.width, canvas.height)
      pdf.save(`${course.title.replace(/\s+/g, "_")}_Certificate.pdf`)
    } catch (err) {
      console.error("Certificate generation error:", err)
      alert("Failed to generate and download certificate. Please try again.")
    } finally {
      setDownloadingId(null)
    }
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

      let loginEmail = email.trim()
      
      if (!loginEmail.includes("@")) {
        const phoneQ = query(collection(db, "students"), where("phone", "==", loginEmail))
        const phoneSnap = await getDocs(phoneQ)
        if (!phoneSnap.empty) {
          const studentDoc = phoneSnap.docs[0]
          const studentData = studentDoc.data()
          if (studentData.email) {
            loginEmail = studentData.email
          }
        } else {
          setError("No student record found with this phone number.")
          setIsLoading(false)
          return
        }
      }

      const userCredential = await signInWithEmailAndPassword(auth, loginEmail, password)
      const user = userCredential.user

      let studentsQ = query(collection(db, "students"), where("uid", "==", user.uid))
      let studentsSnap = await getDocs(studentsQ)

      if (studentsSnap.empty) {
        studentsQ = query(collection(db, "students"), where("email", "==", loginEmail))
        studentsSnap = await getDocs(studentsQ)
      }

      if (studentsSnap.empty) {
        setError("No student record found for this account. Please contact support.")
        await signOut(auth)
        setIsLoading(false)
        return
      }

      const studentDoc = studentsSnap.docs[0]
      const studentData = studentDoc.data()
      const foundName = studentData.name as string

      const allStudentDocs = studentsSnap.docs
      const courseEntries: StudentCourse[] = []

      for (const sDoc of allStudentDocs) {
        const sData = sDoc.data()
        const courseId = sData.courseId as string
        if (!courseId) continue

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
          certificateId: sData.certificateId || undefined,
          registrationNo: sData.registrationNo || undefined,
          certificateTemplate: courseData?.certificateTemplate || undefined,
          courseStartDate: sData.courseStartDate || undefined,
          courseEndDate: sData.courseEndDate || undefined,
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

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="relative rounded-lg border border-border bg-card p-8 shadow-2xl">
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
                  Enter your registered phone number or email to access your courses and certificates
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="Email or Phone Number"
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
              {courses.filter((c) => c.completed && c.certificateId).length}
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
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#10b981]/15 text-[#10b981] text-xs font-semibold border border-[#10b981]/30">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Completed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-muted-foreground text-xs font-semibold">
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
                  <Button
                    onClick={() => handleDownload(course, studentName)}
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
