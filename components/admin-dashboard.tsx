"use client"

import { useState, useEffect, useRef } from "react"
import {
  BookOpen,
  Users,
  FileText,
  Plus,
  Pencil,
  X,
  Upload,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Trash2,
  LayoutDashboard,
  Award,
  Settings as SettingsIcon,
  Bell,
  Search,
  Download,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { db } from "@/lib/firebase"
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore"
import { setDoc, getDoc } from "firebase/firestore"
import QRCode from "qrcode"

async function uploadToStorage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("upload_preset", "yash-preset")

  const res = await fetch("https://api.cloudinary.com/v1_1/dprxaeuwi/image/upload", {
    method: "POST",
    body: formData,
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error?.message || "Failed to upload file to Cloudinary.")
  }

  return data.secure_url
}

type AdminTab = "dashboard" | "courses" | "students" | "templates"

interface Course {
  id: string
  title: string
  description: string
  duration: string
  status: string
  thumbnail: string | null
  certificateTemplate: string | null
  createdAt?: Date
}

interface Student {
  id: string
  name: string
  phone: string
  email: string
  password?: string
  courseId: string
  courseName: string
  completed: boolean
  completedAt?: string
  certificateUrl?: string
  certificateId?: string
  registrationNo?: string
  courseStartDate?: string
  courseEndDate?: string
}

export function AdminDashboard({ onLogout }: { onLogout?: () => void }) {
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard")
  const [courses, setCourses] = useState<Course[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Verification & Canvas preview states
  const [previewCertId, setPreviewCertId] = useState("BGEIM/2026/ACD/001")
  const [verifiedCertData, setVerifiedCertData] = useState<any | null>(null)
  const [certVerifying, setCertVerifying] = useState(false)
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // Completion dates modal states
  const [completionModalStudent, setCompletionModalStudent] = useState<Student | null>(null)
  const [completionDates, setCompletionDates] = useState({
    startDate: "",
    endDate: "",
  })

  // Modals
  const [showCourseModal, setShowCourseModal] = useState(false)
  const [showStudentModal, setShowStudentModal] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [globalTemplate, setGlobalTemplate] = useState<string | null>(null)
  const [uploadingGlobal, setUploadingGlobal] = useState(false)
  const [uploadingCertFor, setUploadingCertFor] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean
    type: "course" | "student"
    id: string
    title: string
  } | null>(null)

  // New course form
  const [newCourse, setNewCourse] = useState({
    title: "",
    description: "",
    duration: "",
    status: "active",
  })
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [templateFile, setTemplateFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [templatePreview, setTemplatePreview] = useState<string | null>(null)

  // New student form
  const [newStudent, setNewStudent] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    courseId: "",
  })

  const certInputRef = useRef<HTMLInputElement>(null)
  const certUploadStudentId = useRef<string | null>(null)

  const sidebarItems = [
    { id: "dashboard" as AdminTab, label: "Admin", icon: LayoutDashboard },
    { id: "courses" as AdminTab, label: "Dashboard", icon: BookOpen },
    { id: "students" as AdminTab, label: "Generate Certificate", icon: Award },
    { id: "templates" as AdminTab, label: "Account Settings", icon: SettingsIcon },
  ]

  // ─── Real-time Firestore listeners ───────────────────────────────────────
  useEffect(() => {
    if (!db) {
      setLoading(false)
      return
    }

    const coursesQ = query(collection(db, "courses"))
    const unsubCourses = onSnapshot(coursesQ, (snap) => {
      const fetchedCourses = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Course, "id">) }))
      fetchedCourses.sort((a, b) => {
        const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt as any)?.seconds ? (a.createdAt as any).seconds * 1000 : 0
        const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt as any)?.seconds ? (b.createdAt as any).seconds * 1000 : 0
        return timeB - timeA
      })
      setCourses(fetchedCourses)
      setLoading(false)
    }, (error) => {
      console.error("Courses snapshot error:", error)
    })

    const studentsQ = query(collection(db, "students"))
    const unsubStudents = onSnapshot(studentsQ, (snap) => {
      const fetchedStudents = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Student, "id">) }))
      fetchedStudents.sort((a, b) => {
        const timeA = (a as any).createdAt instanceof Date ? (a as any).createdAt.getTime() : (a as any).createdAt?.seconds ? (a as any).createdAt.seconds * 1000 : 0
        const timeB = (b as any).createdAt instanceof Date ? (b as any).createdAt.getTime() : (b as any).createdAt?.seconds ? (b as any).createdAt.seconds * 1000 : 0
        return timeB - timeA
      })
      setStudents(fetchedStudents)
    }, (error) => {
      console.error("Students snapshot error:", error)
    })

    const unsubGlobal = onSnapshot(doc(db, "settings", "global"), (snap) => {
      if (snap.exists()) {
        setGlobalTemplate(snap.data().certificateTemplate || null)
      }
    }, (error) => {
      console.error("Global template snapshot error:", error)
    })

    return () => {
      unsubCourses()
      unsubStudents()
      unsubGlobal()
    }
  }, [])

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const enrollmentCount = (courseId: string) =>
    students.filter((s) => s.courseId === courseId).length

  // ─── Course actions ───────────────────────────────────────────────────────
  const handleCreateCourse = async () => {
    if (!newCourse.title || !newCourse.description || !db) return
    setSaving(true)
    try {
      let thumbnailUrl: string | null = null
      let templateUrl: string | null = null

      if (thumbnailFile) thumbnailUrl = await uploadToStorage(thumbnailFile)
      if (templateFile) templateUrl = await uploadToStorage(templateFile)

      await addDoc(collection(db, "courses"), {
        title: newCourse.title,
        description: newCourse.description,
        duration: newCourse.duration,
        status: newCourse.status,
        thumbnail: thumbnailUrl,
        certificateTemplate: templateUrl,
        createdAt: serverTimestamp(),
      })

      setNewCourse({ title: "", description: "", duration: "", status: "active" })
      setThumbnailFile(null)
      setTemplateFile(null)
      setThumbnailPreview(null)
      setTemplatePreview(null)
      setShowCourseModal(false)
    } catch (err: any) {
      console.error("Error creating course:", err)
      alert(err.message || "Failed to create course")
    }
    setSaving(false)
  }

  const handleUpdateCourse = async () => {
    if (!editingCourse || !db) return
    setSaving(true)
    try {
      let thumbnailUrl = editingCourse.thumbnail
      let templateUrl = editingCourse.certificateTemplate

      if (thumbnailFile) thumbnailUrl = await uploadToStorage(thumbnailFile)
      if (templateFile) templateUrl = await uploadToStorage(templateFile)

      await updateDoc(doc(db, "courses", editingCourse.id), {
        title: editingCourse.title,
        description: editingCourse.description,
        duration: editingCourse.duration,
        status: editingCourse.status,
        thumbnail: thumbnailUrl,
        certificateTemplate: templateUrl,
      })

      setEditingCourse(null)
      setThumbnailFile(null)
      setTemplateFile(null)
      setThumbnailPreview(null)
      setTemplatePreview(null)
    } catch (err: any) {
      console.error("Error updating course:", err)
      alert(err.message || "Failed to update course")
    }
    setSaving(false)
  }

  const handleDeleteCourse = async (courseId: string) => {
    if (!db) return
    await deleteDoc(doc(db, "courses", courseId))
  }

  // ─── Student actions ─────────────────────────────────────────────────────
  const handleRegisterStudent = async () => {
    if (!newStudent.name || !newStudent.email || !newStudent.password || !newStudent.courseId || !db) return
    setSaving(true)
    try {
      const selectedCourse = courses.find((c) => c.id === newStudent.courseId)
      if (!selectedCourse) throw new Error("Selected course not found")

      const res = await fetch("/api/admin/create-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newStudent.email,
          password: newStudent.password,
          name: newStudent.name,
          phone: newStudent.phone || "",
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create Auth account")

      await setDoc(doc(db, "students", data.uid), {
        uid: data.uid,
        name: newStudent.name,
        phone: newStudent.phone || "",
        email: newStudent.email,
        password: newStudent.password,
        courseId: newStudent.courseId,
        courseName: selectedCourse.title,
        completed: false,
        certificateUrl: null,
        createdAt: serverTimestamp(),
      })
      setNewStudent({ name: "", phone: "", email: "", password: "", courseId: "" })
      setShowStudentModal(false)
    } catch (err: any) {
      console.error("Error registering student:", err)
      alert(err.message || "Failed to register student")
    }
    setSaving(false)
  }

  const handleToggleComplete = async (student: Student) => {
    if (!db) return
    const newCompleted = !student.completed

    if (newCompleted) {
      // Open modal to configure completion dates
      const defaultStart = "05/02/2024"
      const defaultEnd = "17/02/2024"

      setCompletionDates({
        startDate: defaultStart,
        endDate: defaultEnd,
      })
      setCompletionModalStudent(student)
    } else {
      // Immediately revoke completion
      setSaving(true)
      try {
        await updateDoc(doc(db, "students", student.id), {
          completed: false,
          completedAt: null,
          certificateId: null,
          registrationNo: null,
          certificateUrl: null,
          courseStartDate: null,
          courseEndDate: null,
        })

        const certDocId = student.certificateId?.replace(/\//g, "-")
        if (certDocId) {
          await deleteDoc(doc(db, "certificates", certDocId))
        }
      } catch (err) {
        console.error("Error revoking completion:", err)
      }
      setSaving(false)
    }
  }

  const saveToggleComplete = async () => {
    if (!db || !completionModalStudent) return
    setSaving(true)
    try {
      const student = completionModalStudent
      const course = courses.find((c) => c.id === student.courseId)
      const courseCode = course?.title
        ? course.title.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 3)
        : "GEN"
      const year = new Date().getFullYear()
      const randNum = Math.floor(100 + Math.random() * 900)

      const certificateId = `BGEIM/${year}/${courseCode}/${randNum}`
      const registrationNo = `BGEIM-${courseCode}-${year}-${randNum}`

      const formatStart = completionDates.startDate
      const formatEnd = completionDates.endDate

      const updateData = {
        completed: true,
        completedAt: formatEnd,
        certificateId,
        registrationNo,
        certificateUrl: "generated",
        courseStartDate: formatStart,
        courseEndDate: formatEnd,
      }

      const certDocId = certificateId.replace(/\//g, "-")
      await setDoc(doc(db, "certificates", certDocId), {
        certificateId,
        registrationNo,
        studentId: student.id,
        studentName: student.name,
        courseId: student.courseId,
        courseName: student.courseName,
        duration: course?.duration || "",
        issuedAt: formatEnd,
        courseStartDate: formatStart,
        courseEndDate: formatEnd,
        createdAt: serverTimestamp(),
      })

      await updateDoc(doc(db, "students", student.id), updateData)
      setCompletionModalStudent(null)
    } catch (err: any) {
      console.error("Error setting completion:", err)
      alert(err.message || "Failed to complete course")
    }
    setSaving(false)
  }

  const handleDeleteStudent = async (studentId: string) => {
    if (!db) return
    await deleteDoc(doc(db, "students", studentId))
  }

  const handleDashboardVerify = async () => {
    if (!db || !previewCertId) return
    setCertVerifying(true)
    try {
      const searchId = previewCertId.trim()
      const docId = searchId.replace(/\//g, "-")
      const certRef = doc(db, "certificates", docId)
      const certSnap = await getDoc(certRef)
      if (certSnap.exists()) {
        const data = certSnap.data()
        setVerifiedCertData(data)
        setTimeout(() => {
          drawPreviewCertificate(data)
        }, 100)
      } else {
        setVerifiedCertData({ error: "Certificate not found" })
      }
    } catch (e) {
      console.error(e)
      setVerifiedCertData({ error: "Error verifying certificate" })
    } finally {
      setCertVerifying(false)
    }
  }

  const drawPreviewCertificate = async (data: any) => {
    const canvas = previewCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const img = new Image()
    img.crossOrigin = "anonymous"
    const templateSrc = data.certificateTemplate || globalTemplate || "https://example.com/invalid-placeholder.jpg"

    await new Promise<void>((resolve) => {
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve()
      }
      img.onerror = () => {
        ctx.fillStyle = "#FDFBF7"
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        ctx.strokeStyle = "#800020"
        ctx.lineWidth = 12
        ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30)
        resolve()
      }
      img.src = templateSrc
    })

    ctx.textBaseline = "middle"

    // Text horizontal center is scaled at X = 1280 * 0.3 = 384
    const textCenterX = 384

    // Line 1: This is to Certify that
    ctx.textAlign = "center"
    ctx.font = "italic 10.8px 'Georgia', serif"
    ctx.fillStyle = "#374151"
    ctx.fillText("This is to Certify that", textCenterX, 171)

    // Line 2: Mr./Ms. (in small black) and Participant Name (in red)
    // prefix is Mr./Ms. , name is studentName
    ctx.font = "italic 10.8px 'Georgia', serif"
    const prefixWidth = ctx.measureText("Mr./Ms. ").width
    ctx.font = "bold italic 16.8px 'Georgia', serif"
    const nameWidth = ctx.measureText(data.studentName || "").width

    const totalWidth = prefixWidth + nameWidth
    const startX = textCenterX - totalWidth / 2

    ctx.textAlign = "left"
    ctx.font = "italic 10.8px 'Georgia', serif"
    ctx.fillStyle = "#374151"
    ctx.fillText("Mr./Ms. ", startX, 192)

    ctx.font = "bold italic 16.8px 'Georgia', serif"
    ctx.fillStyle = "#800020" // Crimson Red
    ctx.fillText(data.studentName || "", startX + prefixWidth, 192)

    // Reset back to center alignment for other lines
    ctx.textAlign = "center"

    // Line 3: has Successfully
    ctx.font = "italic 10.8px 'Georgia', serif"
    ctx.fillStyle = "#374151"
    ctx.fillText("has Successfully", textCenterX, 211.5)

    // Line 4: Participated in [Duration] training on
    ctx.font = "italic 10.8px 'Georgia', serif"
    ctx.fillStyle = "#374151"
    const durLabel = data.duration ? `${data.duration} ` : ""
    ctx.fillText(`Participated in ${durLabel}training on`, textCenterX, 231)

    // Line 5: "[Course Title]"
    ctx.font = "bold 13.8px 'Georgia', serif"
    ctx.fillStyle = "#111827"
    ctx.fillText(`"${data.courseName || ""}"`, textCenterX, 253.5)

    // Line 6: from [startDate] to [endDate] organised by
    ctx.font = "italic 10.8px 'Georgia', serif"
    ctx.fillStyle = "#374151"
    const start = data.courseStartDate || "05/02/2024"
    const end = data.courseEndDate || data.issuedAt || "17/02/2024"
    ctx.fillText(`from ${start} to ${end} organised by`, textCenterX, 273)

    // Line 7: Department (shifted up slightly to prevent overlap)
    ctx.font = "italic 10.8px 'Georgia', serif"
    ctx.fillStyle = "#374151"
    ctx.fillText("Mechanical Engineering Department.", textCenterX, 291)

    // Draw Metadata (Bottom Left in white space)
    ctx.textAlign = "left"
    ctx.font = "bold 7px 'Courier New', monospace"
    ctx.fillStyle = "#374151"
    ctx.fillText(`Cert No: ${data.certificateId || ""}`, 72, 335)
    ctx.fillText(`Reg No : ${data.registrationNo || ""}`, 72, 340)
    ctx.fillText(`Issue  : ${data.issuedAt || ""}`, 72, 345)

    // Draw QR Code centered inside the white outlined box on the left banner
    // High-res: X = 370, Y = 440, size = 190x190. Scaled: X = 111, Y = 132, size = 57
    const verificationUrl = `${window.location.origin}?verify=${encodeURIComponent(data.certificateId)}`
    try {
      const qrDataUrl = await QRCode.toDataURL(verificationUrl, { margin: 1, width: 80 })
      const qrImg = new Image()
      await new Promise<void>((resolve) => {
        qrImg.onload = () => {
          ctx.drawImage(qrImg, 109, 135, 61, 61)
          resolve()
        }
        qrImg.onerror = () => resolve()
        qrImg.src = qrDataUrl
      })
    } catch (e) {
      console.error("Preview QR generator error:", e)
    }
  }

  const handleDownloadVerifiedCert = async () => {
    if (!verifiedCertData || verifiedCertData.error) return
    try {
      const canvas = document.createElement("canvas")
      canvas.width = 2000
      canvas.height = 1414
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const img = new Image()
      img.crossOrigin = "anonymous"
      const templateSrc = verifiedCertData.certificateTemplate || globalTemplate || "https://example.com/invalid-placeholder.jpg"

      await new Promise<void>((resolve) => {
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          resolve()
        }
        img.onerror = () => {
          ctx.fillStyle = "#FDFBF7"
          ctx.fillRect(0, 0, canvas.width, canvas.height)

          ctx.strokeStyle = "#800020"
          ctx.lineWidth = 20
          ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80)
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
      const nameWidth = ctx.measureText(verifiedCertData.studentName).width

      const totalWidth = prefixWidth + nameWidth
      const startX = textCenterX - totalWidth / 2

      ctx.textAlign = "left"
      ctx.font = "italic 36px 'Georgia', serif"
      ctx.fillStyle = "#374151"
      ctx.fillText("Mr./Ms. ", startX, 640)

      ctx.font = "bold italic 56px 'Georgia', serif"
      ctx.fillStyle = "#800020"
      ctx.fillText(verifiedCertData.studentName, startX + prefixWidth, 640)

      // Reset back to center alignment for other lines
      ctx.textAlign = "center"

      // Line 3: has Successfully
      ctx.font = "italic 36px 'Georgia', serif"
      ctx.fillStyle = "#374151"
      ctx.fillText("has Successfully", textCenterX, 705)

      // Line 4: Participated in [Duration] training on
      ctx.font = "italic 36px 'Georgia', serif"
      ctx.fillStyle = "#374151"
      const durLabel = verifiedCertData.duration ? `${verifiedCertData.duration} ` : ""
      ctx.fillText(`Participated in ${durLabel}training on`, textCenterX, 770)

      // Line 5: "[Course Title]"
      ctx.font = "bold 46px 'Georgia', serif"
      ctx.fillStyle = "#111827"
      ctx.fillText(`"${verifiedCertData.courseName}"`, textCenterX, 845)

      // Line 6: from [startDate] to [endDate] organised by
      ctx.font = "italic 36px 'Georgia', serif"
      ctx.fillStyle = "#374151"
      const start = verifiedCertData.courseStartDate || "05/02/2024"
      const end = verifiedCertData.courseEndDate || verifiedCertData.issuedAt || "17/02/2024"
      ctx.fillText(`from ${start} to ${end} organised by`, textCenterX, 910)

      // Line 7: Department (shifted upward to prevent trainers signature overlap)
      ctx.font = "italic 36px 'Georgia', serif"
      ctx.fillStyle = "#374151"
      ctx.fillText("Mechanical Engineering Department.", textCenterX, 970)

      // Metadata (Bottom Left)
      ctx.textAlign = "left"
      ctx.font = "bold 22px 'Courier New', monospace"
      ctx.fillStyle = "#374151"
      ctx.fillText(`Certificate No : ${verifiedCertData.certificateId}`, 240, 1150)
      ctx.fillText(`Registration No: ${verifiedCertData.registrationNo}`, 240, 1175)
      ctx.fillText(`Date of Issue  : ${verifiedCertData.issuedAt}`, 240, 1200)

      // Draw QR Code centered inside the white outlined box on the left banner
      const verificationUrl = `${window.location.origin}?verify=${encodeURIComponent(verifiedCertData.certificateId)}`
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

      const { jsPDF } = await import("jspdf")
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [canvas.width, canvas.height]
      })

      pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, canvas.width, canvas.height)
      pdf.save(`${verifiedCertData.courseName.replace(/\s+/g, "_")}_Certificate.pdf`)
    } catch (e) {
      console.error(e)
      alert("Failed to download verified certificate.")
    }
  }

  const handleUploadGlobalTemplate = async (file: File) => {
    if (!db) return
    setUploadingGlobal(true)
    try {
      const url = await uploadToStorage(file)
      await setDoc(doc(db, "settings", "global"), { certificateTemplate: url }, { merge: true })
    } catch (err) {
      console.error("Error uploading global template:", err)
      alert("Failed to upload global template.")
    }
    setUploadingGlobal(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading dashboard…</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col md:flex-row font-sans text-foreground">
      {/* Sidebar - Desktop Only */}
      <aside className="hidden md:flex w-64 bg-gradient-to-b from-[#800020] to-[#400010] text-white flex-col justify-between shrink-0 border-r border-[#ffffff10]">
        <div>
          {/* Logo Header */}
          <div className="px-6 py-5 border-b border-[#ffffff15] bg-[#800020] flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-white tracking-tight">Baderia</span>
              <span className="text-xl font-bold bg-white text-[#800020] px-1.5 py-0.5 rounded text-[10px] tracking-wider uppercase font-sans">Global</span>
            </div>
            <p className="text-[9px] text-[#ffffff80] font-medium tracking-wider uppercase">
              Institute of Engineering & Management
            </p>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 text-left",
                  activeTab === item.id
                    ? "bg-[#ffffff15] border-l-4 border-[#D4AF37] text-white"
                    : "text-[#ffffffaa] hover:bg-[#ffffff08] hover:text-white"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Profile Footer */}
        <div className="p-4 border-t border-[#ffffff15] bg-[#3a0007] space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center font-bold text-white">
              A
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">Admin</p>
              <p className="text-[10px] text-white/60 truncate">admin@bgim.in</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 rounded transition-colors text-white"
          >
            <SettingsIcon className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-border/30 h-16 px-6 flex items-center justify-between shrink-0 shadow-sm z-10">
          <h2 className="text-lg font-bold text-foreground tracking-tight">
            Admin Panel Preview
          </h2>
          <div className="flex items-center gap-4">
            {/* Notification Badge */}
            <button className="relative p-2 rounded-full hover:bg-secondary transition-colors">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
            </button>
            {/* User Dropdown Mock */}
            <div className="flex items-center gap-2 pl-2 border-l border-border/50">
              <div className="h-8 w-8 rounded-full bg-[#800020] text-white flex items-center justify-center text-xs font-bold">
                AD
              </div>
              <span className="text-xs text-muted-foreground font-medium hidden md:inline">
                admin@bgim.in
              </span>
            </div>
          </div>
        </header>

        {/* Inner Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#FDFBF7]">
          {/* Mobile Tabs */}
          <div className="md:hidden flex gap-2 border-b border-border/40 pb-4 mb-6 overflow-x-auto">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                  activeTab === item.id
                    ? "bg-[#800020] text-white"
                    : "text-muted-foreground hover:bg-secondary"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </div>

          {/* ── 1. Dashboard Tab ─────────────────────────────────────── */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* Stat Cards Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Certificates */}
                <div className="bg-[#3b82f6] text-white p-6 rounded-xl shadow-md flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white/80 font-medium uppercase tracking-wider">Total Certificates</p>
                    <h3 className="text-3xl font-black mt-2">
                      {1258 + students.filter(s => s.completed).length}
                    </h3>
                  </div>
                  <div className="p-3 bg-white/10 rounded-lg">
                    <FileText className="h-6 w-6" />
                  </div>
                </div>

                {/* Verified Downloads */}
                <div className="bg-[#10b981] text-white p-6 rounded-xl shadow-md flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white/80 font-medium uppercase tracking-wider">Verified Downloads</p>
                    <h3 className="text-3xl font-black mt-2">
                      {945 + students.filter(s => s.completed).length}
                    </h3>
                  </div>
                  <div className="p-3 bg-white/10 rounded-lg">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                </div>

                {/* Pending Verifications */}
                <div className="bg-[#f97316] text-white p-6 rounded-xl shadow-md flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white/80 font-medium uppercase tracking-wider">Pending Verifications</p>
                    <h3 className="text-3xl font-black mt-2">
                      {112 + students.filter(s => !s.completed).length}
                    </h3>
                  </div>
                  <div className="p-3 bg-white/10 rounded-lg">
                    <Loader2 className="h-6 w-6" />
                  </div>
                </div>
              </div>

              {/* Main Content Splitted Area */}
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Left Side: Recent & Search Forms */}
                <div className="flex-1 space-y-6">
                  {/* Welcome Message Card */}
                  <div className="bg-white border border-border/20 p-6 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-foreground text-md">
                        Welcome Back <span className="text-[#800020]">Admin!</span>
                      </h4>
                      <button onClick={() => setActiveTab("students")} className="text-xs text-[#800020] hover:underline font-semibold">
                        View All
                      </button>
                    </div>

                    {/* Recent Certificates Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-secondary/40 text-muted-foreground font-semibold text-xs uppercase border-b border-border/30">
                          <tr>
                            <th className="px-4 py-2">Certificate No</th>
                            <th className="px-4 py-2">Student Name</th>
                            <th className="px-4 py-2">Course & Duration</th>
                            <th className="px-4 py-2">Date of Issue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.filter(s => s.completed).slice(0, 3).map((st) => (
                            <tr key={st.id} className="border-b border-border/10 hover:bg-secondary/20">
                              <td className="px-4 py-3 font-semibold text-xs text-[#800020]">
                                {st.certificateId || "BGEIM-GEN-001"}
                              </td>
                              <td className="px-4 py-3 font-medium text-foreground">{st.name}</td>
                              <td className="px-4 py-3 text-muted-foreground text-xs">{st.courseName}</td>
                              <td className="px-4 py-3 text-muted-foreground text-xs">{st.completedAt}</td>
                            </tr>
                          ))}
                          {/* Fallback mock list if firebase is empty */}
                          {students.filter(s => s.completed).length === 0 && (
                            <>
                              <tr className="border-b border-border/10">
                                <td className="px-4 py-3 font-semibold text-xs text-[#800020]">BGEIM/2026/ACD/001</td>
                                <td className="px-4 py-3 font-medium">Supreet Mahadeokar</td>
                                <td className="px-4 py-3 text-muted-foreground text-xs">AutoCAD - 40 Hours</td>
                                <td className="px-4 py-3 text-muted-foreground text-xs">27 Feb 2026</td>
                              </tr>
                              <tr className="border-b border-border/10">
                                <td className="px-4 py-3 font-semibold text-xs text-[#800020]">BGEIM/2026/AUT/102</td>
                                <td className="px-4 py-3 font-medium">Demo student</td>
                                <td className="px-4 py-3 text-muted-foreground text-xs">AUTOCAD Odyssey - 7 Months</td>
                                <td className="px-4 py-3 text-muted-foreground text-xs">24 May 2026</td>
                              </tr>
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Verification Widget Card */}
                  <div className="bg-white border border-border/20 p-6 rounded-xl shadow-sm space-y-4">
                    <div className="flex gap-4 border-b border-border/30 pb-3">
                      <button className="px-3 py-1.5 bg-[#800020] text-white rounded text-xs font-semibold">
                        Generate Certificate
                      </button>
                      <button className="px-3 py-1.5 border border-border bg-white text-muted-foreground rounded text-xs font-semibold hover:bg-secondary">
                        Verify Certificate
                      </button>
                    </div>

                    <div className="space-y-4">
                      <p className="text-xs text-muted-foreground">
                        Input the unique Certificate ID to verify its validity and display the preview.
                      </p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g. BGEIM/2026/ACD/001"
                          value={previewCertId}
                          onChange={(e) => setPreviewCertId(e.target.value)}
                          className="bg-input border-border/50 text-sm"
                        />
                        <Button
                          onClick={handleDashboardVerify}
                          disabled={certVerifying}
                          className="bg-[#10b981] hover:bg-[#0f9f6f] text-white font-semibold text-xs px-6"
                        >
                          {certVerifying ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <Search className="h-3.5 w-3.5 mr-1" />
                          )}
                          Verify Now
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Mock Student Certificate Panel Preview */}
                <div className="w-full lg:w-[420px] shrink-0">
                  <div className="bg-white border border-border/20 p-6 rounded-xl shadow-sm space-y-4">
                    <h4 className="font-bold text-foreground text-sm border-b border-border/30 pb-2">
                      Student Panel Preview
                    </h4>
                    <div>
                      <p className="text-xs font-semibold text-[#800020]">Welcome Back {verifiedCertData?.studentName || "Student"}!</p>
                      <div className="flex items-center gap-1 border border-border rounded mt-2 px-2 py-1.5 bg-secondary/20">
                        <Search className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground truncate">
                          {previewCertId || "Search by Certificate No..."}
                        </span>
                      </div>
                    </div>

                    {/* Canvas Live Preview Card */}
                    <div className="relative aspect-[16/11] border border-border/40 rounded-lg overflow-hidden bg-secondary shadow-sm flex items-center justify-center">
                      <canvas
                        ref={previewCanvasRef}
                        width={600}
                        height={424}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* Verify status overlay info */}
                    {verifiedCertData && (
                      <div className="text-xs p-3 rounded bg-secondary/30 border border-border/30 space-y-1">
                        {verifiedCertData.error ? (
                          <p className="text-destructive font-semibold text-center">{verifiedCertData.error}</p>
                        ) : (
                          <>
                            <p className="text-foreground font-semibold">Student Name: {verifiedCertData.studentName}</p>
                            <p className="text-muted-foreground text-[10px]">Course: {verifiedCertData.courseName}</p>
                            <p className="text-[#10b981] font-bold text-[10px] flex items-center gap-1 mt-1">
                              <CheckCircle2 className="h-3 w-3" /> VERIFIED CERTIFICATE RECORD
                            </p>
                            <Button
                              onClick={handleDownloadVerifiedCert}
                              className="w-full mt-3 bg-[#800020] hover:bg-[#600015] text-white text-xs font-bold py-2 rounded flex items-center justify-center gap-1.5"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Download Certificate PDF
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── 2. Courses Tab ───────────────────────────────────────────── */}
          {activeTab === "courses" && (
            <div>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Course Management</h1>
                  <p className="text-muted-foreground mt-1">Create and manage your certification courses</p>
                </div>
                <Button
                  onClick={() => setShowCourseModal(true)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Course
                </Button>
              </div>

              {courses.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground bg-white border border-border/20 rounded-xl shadow-sm">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30 animate-pulse text-primary" />
                  <p className="text-lg font-semibold">No courses created yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Get started by creating your first course.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courses.map((course) => (
                    <div
                      key={course.id}
                      className="group rounded-xl border border-border/30 bg-card overflow-hidden hover:shadow-lg transition-all duration-300"
                    >
                      <div className="aspect-[16/10] bg-secondary flex items-center justify-center border-b border-border/20 overflow-hidden relative">
                        {course.thumbnail ? (
                          <img
                            src={course.thumbnail}
                            alt={course.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex flex-col items-center text-muted-foreground">
                            <BookOpen className="h-10 w-10 opacity-40 mb-2" />
                            <span className="text-xs">No image uploaded</span>
                          </div>
                        )}
                        <div className="absolute top-3 right-3 bg-card/90 backdrop-blur-sm border border-border/40 px-2 py-0.5 rounded text-xs font-semibold text-[#800020] uppercase">
                          {course.status}
                        </div>
                      </div>
                      <div className="p-5 space-y-4">
                        <div>
                          <h3 className="font-bold text-foreground text-lg truncate">{course.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{course.description}</p>
                        </div>
                        <div className="flex items-center justify-between text-xs border-t border-border/20 pt-4">
                          <span className="text-muted-foreground font-medium">Duration: {course.duration || "N/A"}</span>
                          <span className="text-[#800020] font-semibold">{enrollmentCount(course.id)} enrolled</span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-foreground border-border hover:bg-secondary"
                            onClick={() => {
                              setEditingCourse(course)
                              setThumbnailPreview(null)
                              setTemplatePreview(null)
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1.5" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() =>
                              setDeleteConfirm({
                                isOpen: true,
                                type: "course",
                                id: course.id,
                                title: course.title,
                              })
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── 3. Students Tab (Generate Certificate View) ────────────────── */}
          {activeTab === "students" && (
            <div>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Students Enrollment & Certificates</h1>
                  <p className="text-muted-foreground mt-1">Enroll students and issue automatic certificates</p>
                </div>
                <Button
                  onClick={() => setShowStudentModal(true)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Enroll Student
                </Button>
              </div>

              {students.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground bg-white border border-border/20 rounded-xl shadow-sm">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-30 text-primary" />
                  <p className="text-lg font-semibold">No students enrolled yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Add students to start issuing certs.</p>
                </div>
              ) : (
                <div className="bg-card border border-border/20 rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-secondary/40 text-muted-foreground font-semibold text-xs uppercase border-b border-border/30">
                        <tr>
                          <th className="px-6 py-4">Student Details</th>
                          <th className="px-6 py-4">Course</th>
                          <th className="px-6 py-4">Status & Certificate ID</th>
                          <th className="px-6 py-4">Issue / Toggle</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/25">
                        {students.map((student) => (
                          <tr key={student.id} className="hover:bg-secondary/15 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-semibold text-foreground">{student.name}</div>
                              <div className="text-xs text-muted-foreground">{student.email}</div>
                              {student.phone && <div className="text-[10px] text-muted-foreground mt-0.5">Phone: {student.phone}</div>}
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-medium text-foreground">{student.courseName}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                <span
                                  className={cn(
                                    "inline-flex w-fit items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                    student.completed
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                      : "bg-amber-100 text-amber-800 border border-amber-200"
                                  )}
                                >
                                  {student.completed ? "Completed" : "Active"}
                                </span>
                                {student.completed && student.certificateId && (
                                  <span className="text-[11px] font-mono text-[#800020] font-semibold mt-0.5">
                                    ID: {student.certificateId}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={student.completed}
                                  onCheckedChange={() => handleToggleComplete(student)}
                                  className="data-[state=checked]:bg-[#10b981]"
                                />
                                <span className="text-xs text-muted-foreground">
                                  {student.completed ? "Revoke Completion" : "Mark Completed"}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() =>
                                  setDeleteConfirm({
                                    isOpen: true,
                                    type: "student",
                                    id: student.id,
                                    title: student.name,
                                  })
                                }
                                className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── 4. Templates Tab (Global Settings View) ────────────────── */}
          {activeTab === "templates" && (
            <div>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Certificate Templates</h1>
                  <p className="text-muted-foreground mt-1">Manage your premium certificate designs</p>
                </div>
              </div>

              {/* Global Template Section */}
              <div className="mb-10 p-6 rounded-lg border border-border bg-card/60 backdrop-blur-sm space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Global Certificate Template</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      This template will be used for all certificates if a course-specific template is not uploaded.
                    </p>
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      id="global-template-upload"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (file) await handleUploadGlobalTemplate(file)
                      }}
                    />
                    <label
                      htmlFor="global-template-upload"
                      className={cn(
                        "inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium cursor-pointer transition-colors bg-primary text-primary-foreground hover:bg-primary/90",
                        uploadingGlobal && "opacity-70 pointer-events-none"
                      )}
                    >
                      {uploadingGlobal ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      Upload Global Template
                    </label>
                  </div>
                </div>

                {globalTemplate ? (
                  <div className="relative aspect-[16/10] max-w-xl mx-auto rounded-lg overflow-hidden border border-border shadow-md bg-secondary">
                    <img
                      src={globalTemplate}
                      alt="Global Certificate Template"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="text-center py-8 border border-dashed border-border rounded-lg bg-secondary/20">
                    <p className="text-sm text-muted-foreground">
                      No global template uploaded. Using procedural vector layout fallback.
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t border-border/50 my-8 pt-8">
                <h2 className="text-lg font-semibold text-foreground mb-4">Course-Specific Templates</h2>
              </div>

              {courses.filter((c) => c.certificateTemplate).length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No course-specific templates uploaded yet. Upload a template when creating or editing a course.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courses
                    .filter((c) => c.certificateTemplate)
                    .map((course) => (
                      <div
                        key={course.id}
                        className="rounded-lg border border-border bg-card overflow-hidden hover:border-primary/50 transition-colors"
                      >
                        <div className="aspect-[4/3] bg-secondary flex items-center justify-center border-b border-border overflow-hidden">
                          {course.certificateTemplate ? (
                            <img
                              src={course.certificateTemplate}
                              alt={`${course.title} template`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FileText className="h-12 w-12 text-muted-foreground" />
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-foreground mb-1">{course.title}</h3>
                          <p className="text-sm text-muted-foreground">Certificate template</p>
                          <a
                            href={course.certificateTemplate!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-block text-xs text-primary underline"
                          >
                            Preview template
                          </a>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Course Modal */}
      {showCourseModal && (
        <CourseModal
          title="Create New Course"
          course={newCourse}
          setCourseFn={(v) => setNewCourse({ ...newCourse, ...v })}
          thumbnailPreview={thumbnailPreview}
          templatePreview={templatePreview}
          onThumbnailFile={setThumbnailFile}
          onTemplateFile={setTemplateFile}
          onConfirm={handleCreateCourse}
          onClose={() => {
            setShowCourseModal(false)
            setThumbnailFile(null)
            setTemplateFile(null)
            setThumbnailPreview(null)
            setTemplatePreview(null)
          }}
          saving={saving}
        />
      )}

      {editingCourse && (
        <CourseModal
          title="Edit Course"
          course={editingCourse}
          setCourseFn={(v) => setEditingCourse({ ...editingCourse, ...v })}
          thumbnailPreview={thumbnailPreview || editingCourse.thumbnail}
          templatePreview={templatePreview || editingCourse.certificateTemplate}
          onThumbnailFile={setThumbnailFile}
          onTemplateFile={setTemplateFile}
          onConfirm={handleUpdateCourse}
          onClose={() => {
            setEditingCourse(null)
            setThumbnailFile(null)
            setTemplateFile(null)
            setThumbnailPreview(null)
            setTemplatePreview(null)
          }}
          saving={saving}
        />
      )}

      {/* Student Modal */}
      {showStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowStudentModal(false)} />
          <div className="relative bg-card border border-border rounded-lg w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">Enroll Student</h2>
              <button onClick={() => setShowStudentModal(false)} className="p-2 rounded-md hover:bg-secondary transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">Full Name</Label>
                <Input
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  placeholder="Enter full name"
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Phone Number</Label>
                <Input
                  value={newStudent.phone}
                  onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                  placeholder="Enter phone number"
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Email Address</Label>
                <Input
                  value={newStudent.email}
                  onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                  placeholder="student@example.com"
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Password (Credentials)</Label>
                <Input
                  type="text"
                  value={newStudent.password}
                  onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                  placeholder="Temporary password"
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Assign Course</Label>
                <select
                  value={newStudent.courseId}
                  onChange={(e) => setNewStudent({ ...newStudent, courseId: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-border bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select a course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                onClick={handleRegisterStudent}
                disabled={saving || !newStudent.name || !newStudent.email || !newStudent.password || !newStudent.courseId}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 mt-4"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Enroll Student
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Completion Dates Modal ────────────────────────────────── */}
      {completionModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setCompletionModalStudent(null)} />
          <div className="relative bg-card border border-border rounded-lg w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">Confirm Completion & Set Dates</h3>
              <button onClick={() => setCompletionModalStudent(null)} className="p-2 rounded-md hover:bg-secondary transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Please enter the course start date and end date for <strong>{completionModalStudent.name}</strong>.
              </p>

              <div className="space-y-2">
                <Label className="text-foreground">Course Start Date</Label>
                <Input
                  type="text"
                  placeholder="e.g. 05/02/2024"
                  value={completionDates.startDate}
                  onChange={(e) => setCompletionDates({ ...completionDates, startDate: e.target.value })}
                  className="bg-input border-border"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Course End / Completion Date</Label>
                <Input
                  type="text"
                  placeholder="e.g. 17/02/2024"
                  value={completionDates.endDate}
                  onChange={(e) => setCompletionDates({ ...completionDates, endDate: e.target.value })}
                  className="bg-input border-border"
                />
              </div>

              <div className="flex gap-4 justify-end mt-6">
                <Button variant="outline" onClick={() => setCompletionModalStudent(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={saveToggleComplete}
                  disabled={saving || !completionDates.startDate || !completionDates.endDate}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Confirm & Issue Certificate
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Dialog ────────────────────────────────── */}
      {deleteConfirm?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-card border border-border rounded-lg w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-foreground mb-2">Delete Confirmation</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to delete the {deleteConfirm.type} <strong className="text-foreground">"{deleteConfirm.title}"</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-4 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="bg-destructive hover:bg-[#a62b2b] text-white"
                onClick={async () => {
                  if (deleteConfirm.type === "course") {
                    await handleDeleteCourse(deleteConfirm.id)
                  } else {
                    await handleDeleteStudent(deleteConfirm.id)
                  }
                  setDeleteConfirm(null)
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Shared Course Modal ──────────────────────────────────────────────────────
interface CourseModalProps {
  title: string
  course: { title: string; description: string; duration: string; status: string }
  setCourseFn: (v: Partial<{ title: string; description: string; duration: string; status: string }>) => void
  thumbnailPreview: string | null
  templatePreview: string | null
  onThumbnailFile: (f: File | null) => void
  onTemplateFile: (f: File | null) => void
  onConfirm: () => void
  onClose: () => void
  saving: boolean
}

function CourseModal({
  title,
  course,
  setCourseFn,
  thumbnailPreview,
  templatePreview,
  onThumbnailFile,
  onTemplateFile,
  onConfirm,
  onClose,
  saving,
}: CourseModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-lg w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-secondary transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-foreground">Course Title</Label>
            <Input
              value={course.title}
              onChange={(e) => setCourseFn({ title: e.target.value })}
              placeholder="Enter course title"
              className="bg-input border-border"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Description</Label>
            <textarea
              value={course.description}
              onChange={(e) => setCourseFn({ description: e.target.value })}
              placeholder="Enter course description"
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-border bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground">Duration</Label>
              <Input
                value={course.duration}
                onChange={(e) => setCourseFn({ duration: e.target.value })}
                placeholder="e.g. 8 weeks"
                className="bg-input border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Status</Label>
              <select
                value={course.status}
                onChange={(e) => setCourseFn({ status: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-border bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Upload zones */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground">Thumbnail</Label>
              <label className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer block">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onThumbnailFile(e.target.files?.[0] || null)}
                />
                {thumbnailPreview ? (
                  <img src={thumbnailPreview} alt="Thumbnail" className="h-20 w-full object-cover rounded" />
                ) : (
                  <>
                    <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground">Click to upload</p>
                  </>
                )}
              </label>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Certificate Template</Label>
              <label className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer block">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => onTemplateFile(e.target.files?.[0] || null)}
                />
                {templatePreview ? (
                  <img src={templatePreview} alt="Template" className="h-20 w-full object-cover rounded" />
                ) : (
                  <>
                    <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground">Click to upload</p>
                  </>
                )}
              </label>
            </div>
          </div>

          <Button
            onClick={onConfirm}
            disabled={saving || !course.title || !course.description}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {title}
          </Button>
        </div>
      </div>
    </div>
  )
}
