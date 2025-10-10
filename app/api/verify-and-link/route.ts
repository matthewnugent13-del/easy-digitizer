import { NextRequest, NextResponse } from "next/server"
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const s3 = new S3Client({ region: process.env.AWS_REGION })

export async function GET(req: NextRequest) {
  const sessionId = new URL(req.url).searchParams.get("session_id")
  if (!sessionId) return NextResponse.json({ error: "session_id required" }, { status: 400 })

  // Fetch Checkout Session via Stripe REST
  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY!}` },
  })
  const session = await res.json()
  if (!res.ok) {
    return NextResponse.json({ error: session?.error?.message || "Stripe session error" }, { status: 500 })
  }

  if (session.payment_status !== "paid") {
    return NextResponse.json({ error: "Payment not completed" }, { status: 402 })
  }

  const jobId = session.metadata?.jobId as string | undefined
  if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 })

  // Hand out signed S3 link to the DST
  const key = `jobs/${jobId}/output.dst`
  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key }),
    { expiresIn: Number(process.env.SIGNED_URL_TTL_SECONDS) || 300 }
  )

  return NextResponse.json({ url })
}
