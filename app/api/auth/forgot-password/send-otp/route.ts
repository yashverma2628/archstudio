import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { resend } from "@/lib/resend"

export async function POST(request: NextRequest) {
  try {
    const { emailOrPhone } = await request.json()

    if (!emailOrPhone) {
      return NextResponse.json(
        { success: false, error: "Email or phone number is required" },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Firebase Admin is not configured" },
        { status: 500 }
      )
    }

    const input = emailOrPhone.trim()
    let studentDoc: any = null
    let emailToSend: string | null = null

    // Determine query strategy (Email vs Phone)
    const isEmail = input.includes("@")
    const studentsRef = db.collection("students")

    if (isEmail) {
      const qSnap = await studentsRef.where("email", "==", input).limit(1).get()
      if (!qSnap.empty) {
        studentDoc = qSnap.docs[0]
        emailToSend = studentDoc.data().email || null
      }
    } else {
      // Query by phone
      const qSnap = await studentsRef.where("phone", "==", input).limit(1).get()
      if (!qSnap.empty) {
        studentDoc = qSnap.docs[0]
        emailToSend = studentDoc.data().email || null
      }
    }

    // Security practice: To prevent email enumeration attacks, if the user doesn't exist,
    // we return a generic success message so hackers can't check which emails are registered.
    if (!studentDoc || !emailToSend) {
      return NextResponse.json({
        success: true,
        message: "If your account is registered, you will receive an OTP code shortly."
      })
    }

    // Rate limiting check: Limit requests to once every 60 seconds
    const studentData = studentDoc.data()
    if (studentData.passwordReset && studentData.passwordReset.requestedAt) {
      const lastRequested = studentData.passwordReset.requestedAt.toDate 
        ? studentData.passwordReset.requestedAt.toDate() 
        : new Date(studentData.passwordReset.requestedAt)
      
      const secondsPassed = Math.floor((Date.now() - lastRequested.getTime()) / 1000)
      if (secondsPassed < 60) {
        return NextResponse.json(
          { success: false, error: `Please wait ${60 - secondsPassed} seconds before requesting a new code.` },
          { status: 429 }
        )
      }
    }

    // Generate a secure 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now

    // Save the OTP, expiry time, request timestamp, and reset failed attempts to Firestore
    await studentDoc.ref.update({
      passwordReset: {
        otp: otp,
        expiresAt: expiresAt,
        requestedAt: new Date(),
        failedAttempts: 0
      }
    })

    // Send the OTP via Resend
    // By default, onboarding@resend.dev is used for testing.
    // If a domain is verified, you can change this to noreply@yourdomain.com.
    const { error } = await resend.emails.send({
      from: "ArchStudio <onboarding@resend.dev>",
      to: [emailToSend],
      subject: "Password Reset Verification Code",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #111827; font-size: 24px; font-weight: 700; margin-bottom: 24px; text-align: center;">ArchStudio Verification Code</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
            A password reset request was initiated for your student portal account. Please use the following one-time verification code (OTP) to reset your password.
          </p>
          <div style="background-color: #f3f4f6; border-radius: 6px; padding: 16px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #111827;">${otp}</span>
          </div>
          <p style="color: #6b7280; font-size: 14px; line-height: 1.5; text-align: center; margin-top: 24px;">
            This code will expire in <strong>10 minutes</strong>. If you did not request this, you can ignore this email.
          </p>
        </div>
      `
    })

    if (error) {
      console.error("Resend API Error:", error)
      return NextResponse.json(
        { success: false, error: "Failed to send email" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "If your account is registered, you will receive an OTP code shortly."
    })

  } catch (err: any) {
    console.error("Send OTP Error:", err)
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
