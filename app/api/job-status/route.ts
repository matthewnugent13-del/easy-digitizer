import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic" // don't cache
export const revalidate = 0

export async function GET(req: NextRequest) {
  const jobId = new URL(req.url).searchParams.get("jobId")
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 })

  // Ask the worker
  const r = await fetch(`${process.env.WORKER_URL}/jobs/${jobId}`, { cache: "no-store" })
  const j = await r.json()

  // Worker returns {status: "processing" | "ready", previewUrl?: "..."}
  if (j?.previewUrl) {
    return NextResponse.json({
      status: "completed",
      previewUrl: j.previewUrl, // <-- real S3 signed URL
    })
  }
  if (j?.status === "processing") {
    return NextResponse.json({ status: "processing" })
  }

  // If worker returns anything odd, stay in processing
  return NextResponse.json({ status: "processing" })
}
