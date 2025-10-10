import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get("file") as File | null
    if (!file) return NextResponse.json({ error: "file required" }, { status: 400 })

    const fd = new FormData()
    fd.append("file", file)

    const worker = process.env.WORKER_URL!
    if (!worker) return NextResponse.json({ error: "WORKER_URL missing" }, { status: 500 })

    // send the upload to your FastAPI worker
    const r = await fetch(`${worker}/jobs`, { method: "POST", body: fd })
    const j = await r.json()

    // Worker returns { jobId: "<uuid>" }
    return NextResponse.json(j, { status: r.ok ? 200 : 500 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "start-job failed" }, { status: 500 })
  }
}
