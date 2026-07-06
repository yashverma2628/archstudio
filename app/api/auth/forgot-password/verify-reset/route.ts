import { NextRequest, NextResponse } from "next/server"
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { emailOrPhone, otp, newPassword } = await request.json()

    if (!emailOrPhone || !otp || !newPassword) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (email/phone, OTP, password)" },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters long" },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    const adminAuth = getAdminAuth()
    if (!db || !adminAuth) {
      return NextResponse.json(
        { success: false, error: "Firebase Admin is not configured" },
        { status: 500 }
      )
    }

    const input = emailOrPhone.trim()
    let studentDoc: any = null

    // Determine query strategy (Email vs Phone)
    const isEmail = input.includes("@")
    const studentsRef = db.collection("students")

    if (isEmail) {
      const qSnap = await studentsRef.where("email", "==", input).limit(1).get()
      if (!qSnap.empty) {
        studentDoc = qSnap.docs[0]
      }
    } else {
      const qSnap = await studentsRef.where("phone", "==", input).limit(1).get()
      if (!qSnap.empty) {
        studentDoc = qSnap.docs[0]
      }
    }

    if (!studentDoc) {
      return NextResponse.json(
        { success: false, error: "No student account found" },
        { status: 404 }
      )
    }

    const studentData = studentDoc.data()
    const resetData = studentData.passwordReset

    if (!resetData || !resetData.otp) {
      return NextResponse.json(
        { success: false, error: "No active password reset request found. Please request a new code." },
        { status: 400 }
      )
    }

    const { otp: storedOtp, expiresAt, failedAttempts } = resetData

    // 1. Security Check: Expired OTP
    const expiryDate = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt)
    if (Date.now() > expiryDate.getTime()) {
      // Clean up expired OTP
      await studentDoc.ref.update({ passwordReset: null })
      return NextResponse.json(
        { success: false, error: "Verification code has expired. Please request a new code." },
        { status: 400 }
      )
    }

    // 2. Security Check: Brute Force Prevention (Max 3 failed attempts)
    if (failedAttempts >= 3) {
      // Invalidate the OTP
      await studentDoc.ref.update({ passwordReset: null })
      return NextResponse.json(
        { success: false, error: "Too many failed attempts. Please request a new verification code." },
        { status: 400 }
      )
    }

    // 3. Compare OTP
    if (otp !== storedOtp) {
      const newFailedAttempts = (failedAttempts || 0) + 1
      
      if (newFailedAttempts >= 3) {
        // Exceeded attempts, lock/delete OTP
        await studentDoc.ref.update({ passwordReset: null })
        return NextResponse.json(
          { success: false, error: "Invalid verification code. Too many failed attempts. Please request a new code." },
          { status: 400 }
        )
      } else {
        // Update failed attempts count
        await studentDoc.ref.update({
          "passwordReset.failedAttempts": newFailedAttempts
        })
        return NextResponse.json(
          { success: false, error: `Invalid verification code. You have ${3 - newFailedAttempts} attempts remaining.` },
          { status: 400 }
        )
      }
    }

    // 4. Verification Successful: Update password in Firebase Authentication
    const uid = studentData.uid
    if (!uid) {
      return NextResponse.json(
        { success: false, error: "User record is corrupted. Missing Firebase Authentication UID." },
        { status: 500 }
      )
    }

    await adminAuth.updateUser(uid, {
      password: newPassword
    })

    // 5. Invalidate the OTP so it cannot be used again
    await studentDoc.ref.update({ passwordReset: null })

    return NextResponse.json({
      success: true,
      message: "Your password has been successfully reset. You can now log in."
    })

  } catch (err: any) {
    console.error("Verify OTP / Reset Password Error:", err)
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    )
  }
}
