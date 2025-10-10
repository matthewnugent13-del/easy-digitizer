"use client"

import { useEffect, useMemo, useState } from "react"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

type JobStatusUI = {
  status: "idle" | "processing" | "completed" | "failed"
  previewUrl?: string
  error?: string
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null) // local preview
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<JobStatusUI>({ status: "idle" })
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [colorCount, setColorCount] = useState<number>(6) // 1–8
  const [progress, setProgress] = useState<number>(0)     // loading bar %

  // local image preview URL
  useEffect(() => {
    if (!file) { setFileUrl(null); return }
    const url = URL.createObjectURL(file)
    setFileUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  // Poll job status + gently advance progress when a job exists
  useEffect(() => {
    if (!jobId) return
    if (jobStatus.status === "completed" || jobStatus.status === "failed") return

    let pct = 25
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/job-status?jobId=${jobId}`)
        const data = await res.json()
        if (data.previewUrl) {
          setJobStatus({ status: "completed", previewUrl: data.previewUrl })
          setProgress(100)
          clearInterval(interval)
        } else {
          pct = Math.min(90, pct + 5)
          setProgress(pct)
          setJobStatus({ status: "processing" })
        }
      } catch (err) {
        console.error(err)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [jobId, jobStatus.status])

  // 1) User selects a PNG — we only store it and show a thumbnail
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null
    setError(null)
    setJobId(null)
    setJobStatus({ status: "idle" })
    setProgress(0)

    if (!selected) { setFile(null); return }
    if (selected.type !== "image/png") {
      setError("Please upload a PNG file.")
      setFile(null)
      return
    }
    setFile(selected)
  }

  // 2) User clicks Generate — we send the PNG + chosen color count to the worker
  const handleGenerate = async () => {
    if (!file) { setError("Please upload a PNG first."); return }
    try {
      setIsUploading(true)
      setError(null)
      setJobStatus({ status: "processing" })
      setProgress(10)

      const formData = new FormData()
      formData.append("file", file)
      formData.append("colors", String(colorCount)) // 1–8 to the worker

      const res = await fetch("/api/start-job", { method: "POST", body: formData })
      if (!res.ok) {
        const t = await res.text()
        throw new Error(t || `Generate failed (${res.status})`)
      }
      const data = await res.json()
      if (!data?.jobId) throw new Error("No jobId returned")
      setJobId(data.jobId)
      setProgress(25)
    } catch (err) {
      console.error(err)
      setError("Failed to generate stitches. Please try again.")
      setJobStatus({ status: "failed", error: "generate failed" })
    } finally {
      setIsUploading(false)
    }
  }

  // amount is in cents (Stripe)
  const handleCheckout = async (amountCents: number) => {
    if (!jobId) { setError("Please generate stitches first."); return }
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, amount: amountCents }),
      })
      const data = await res.json()
      if (data?.url) window.location.href = data.url
      else setError(data?.error || "Checkout failed.")
    } catch (err) {
      console.error(err)
      setError("Checkout failed. Please try again.")
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-semibold tracking-tight">Easy Digitizer</h1>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="text-center mb-12 max-w-2xl">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-balance">
            Upload a PNG → Choose thread colors → Generate stitches → Download DST.
          </h2>
          <p className="text-muted-foreground text-lg">Professional-quality stitch paths with a simple workflow.</p>
        </div>

        <Card className="w-full max-w-2xl bg-card border-border rounded-xl p-8 md:p-12">
          <div className="space-y-6">

            {/* Upload */}
            <div className="relative">
              <input
                type="file"
                accept="image/png"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                disabled={isUploading}
              />
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-foreground/30 transition-colors"
              >
                <Upload className="w-12 h-12 mb-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground mb-1">
                  {file ? file.name : "Click to upload PNG"}
                </span>
                <span className="text-xs text-muted-foreground">PNG files only</span>
              </label>
            </div>

            {/* Show the uploaded image preview (thumbnail) */}
            {fileUrl && (
              <div className="rounded-xl overflow-hidden border border-border">
                <img src={fileUrl} alt="Uploaded" className="w-full h-auto" />
              </div>
            )}

            {/* Color slider */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted-foreground">
                How many thread colors?
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={8}
                  value={colorCount}
                  onChange={(e) => setColorCount(Number(e.target.value))}
                />
                <span className="text-sm font-medium">{colorCount}</span>
              </div>
            </div>

            {/* Generate button */}
            <div className="flex justify-end">
              <Button onClick={handleGenerate} disabled={!file || isUploading} className="h-10 rounded-xl">
                Generate
              </Button>
            </div>

            {/* Loading bar */}
            {(isUploading || jobStatus.status === "processing") && (
              <div className="w-full h-2 rounded bg-border overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}

            {/* Errors */}
            {error && <div className="text-center text-sm text-destructive">{error}</div>}

            {/* Stitch preview + Buy buttons (only after generation) */}
            {jobStatus.previewUrl && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="rounded-xl overflow-hidden border border-border bg-secondary/50">
                  <img src={jobStatus.previewUrl} alt="Stitch preview" className="w-full h-auto" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Button onClick={() => handleCheckout(99)} disabled={!jobId} className="h-12 rounded-xl">
                    Buy $0.99
                  </Button>
                  <Button onClick={() => handleCheckout(299)} disabled={!jobId} className="h-12 rounded-xl">
                    Buy $2.99
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </main>

      <footer className="border-t border-border">
        <div className="container mx-auto px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">No subscriptions. Secure checkout with Stripe.</p>
        </div>
      </footer>
    </div>
  )
}
