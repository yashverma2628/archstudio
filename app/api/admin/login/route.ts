import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    const adminEmail = process.env.ADMIN_EMAIL
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminEmail || !adminPassword) {
      return NextResponse.json(
        { success: false, message: "Admin credentials not configured" },
        { status: 503 }
      )
    }

    if (email === adminEmail && password === adminPassword) {
      return NextResponse.json(
        { success: true, message: "Login successful" },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { success: false, message: "Invalid email or password" },
      { status: 401 }
    )
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { success: false, message: "An error occurred during login" },
      { status: 500 }
    )
  }
}
