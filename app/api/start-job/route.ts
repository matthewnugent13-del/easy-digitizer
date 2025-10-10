import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const worker = process.env.WORKER_URL
    if (!worker) return NextResponse.json({ error: "WORKER_URL is not set" }, { status: 500 })

    const form = await req.formData()
    const file = form.get("file")
    const colors = form.get("colors") || "6"
    if (!(file instanceof File)) return NextResponse.json({ error: "file required (PNG)" }, { status: 400 })

    const fd = new FormData()
    fd.append("file", file, (file as File).name || "upload.png")
    fd.append("colors", String(colors)) // <— forward 1–8 to the worker

    const res = await fetch(`${worker}/jobs`, { method: "POST", body: fd })
    const txt = await res.text()
    let data: any = null; try { data = JSON.parse(txt) } catch {}
    if (!res.ok) return NextResponse.json({ error: data?.error || txt || "worker error" }, { status: 502 })
    if (data?.jobId) return NextResponse.json(data)
    return NextResponse.json({ error: "no jobId from worker" }, { status: 500 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "start-job failed" }, { status: 500 })
  }
}
