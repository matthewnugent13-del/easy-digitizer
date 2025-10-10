import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(req: NextRequest) {
  const jobId = new URL(req.url).searchParams.get("jobId")
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 })

  const worker = process.env.WORKER_URL!
  try {
    const r = await fetch(`${worker}/jobs/${jobId}`, { cache: "no-store" })
    const j = await r.json()
    // Worker gives {status: "processing" | "ready", previewUrl?}
    if (j?.previewUrl) {
      return NextResponse.json({ status: "completed", previewUrl: j.previewUrl })
    }
    if (j?.status === "processing") {
      return NextResponse.json({ status: "processing" })
    }
    // default: keep polling
    return NextResponse.json({ status: "processing" })
  } catch (e: any) {
    return NextResponse.json({ status: "processing" })
  }
}
