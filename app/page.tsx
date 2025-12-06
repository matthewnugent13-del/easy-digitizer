"use client"

import { useEffect, useRef, useState } from "react"
import { Upload, Loader2 } from "lucide-react"
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

  // 1–8 thread colors
  const [colorCount, setColorCount] = useState<number>(6)

  // Disclaimer / upload gate
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [hasAgreedToDisclaimer, setHasAgreedToDisclaimer] = useState(false)

  const handleUploadClick = () => {
    if (!hasAgreedToDisclaimer) {
      setShowDisclaimer(true)
    } else {
      fileInputRef.current?.click()
    }
  }

  const handleDisclaimerAgree = () => {
    setHasAgreedToDisclaimer(true)
    setShowDisclaimer(false)
    fileInputRef.current?.click()
  }

  const handleDisclaimerCancel = () => {
    setShowDisclaimer(false)
  }

  const handleUploadLabelClick = (
    e: React.MouseEvent<HTMLLabelElement, MouseEvent>
  ) => {
    e.preventDefault() // prevent default label → input click
    handleUploadClick()
  }

  // Create/cleanup a local URL for the uploaded image
  useEffect(() => {
    if (!file) {
      setFileUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setFileUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  // Poll job status until preview arrives
  useEffect(() => {
    if (!jobId) return
    if (jobStatus.status === "completed" || jobStatus.status === "failed") return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/job-status?jobId=${jobId}`, { cache: "no-store" })
        const data = await res.json()
        if (data.previewUrl) {
          setJobStatus({ status: "completed", previewUrl: data.previewUrl })
          clearInterval(interval)
        } else {
          setJobStatus({ status: "processing" })
        }
      } catch (err) {
        console.error(err)
        setJobStatus({ status: "failed", error: "Could not fetch status" })
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [jobId, jobStatus.status])

  // User picks a PNG → show thumbnail only (no server call yet)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null
    setError(null)
    setJobId(null)
    setJobStatus({ status: "idle" })
    if (!selected) {
      setFile(null)
      return
    }
    if (selected.type !== "image/png") {
      setError("Please upload a PNG file.")
      setFile(null)
      return
    }
    setFile(selected)
  }

  // Click “Generate” → send PNG + slider value to server
  const handleGenerate = async () => {
    if (!file) {
      setError("Please upload a PNG first.")
      return
    }
    try {
      setIsUploading(true)
      setError(null)
      setJobStatus({ status: "processing" })
      setJobId(null)

      const formData = new FormData()
      formData.append("file", file)
      formData.append("colors", String(colorCount))

      const res = await fetch("/api/start-job", { method: "POST", body: formData })
      if (!res.ok) {
        const t = await res.text()
        throw new Error(t || `Generate failed (${res.status})`)
      }
      const data = await res.json()
      if (!data?.jobId) throw new Error("No jobId returned")
      setJobId(data.jobId)
    } catch (err) {
      console.error(err)
      setError("Failed to generate stitches. Please try again.")
      setJobStatus({ status: "failed", error: "generate failed" })
    } finally {
      setIsUploading(false)
    }
  }

  // amount is in cents for Stripe
  const handleCheckout = async (amountCents: number) => {
    if (!jobId) {
      setError("Please generate stitches first.")
      return
    }
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

  const isLoading = isUploading || jobStatus.status === "processing"

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-semibold tracking-tight">Easy Digitizer</h1>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-12 max-w-2xl">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-balance">
            Upload a PNG → Choose thread colors → Generate stitches → Download DST.
          </h2>
          <p className="text-muted-foreground text-lg">
            Professional-quality stitch paths with a simple workflow.
          </p>
        </div>

        {/* Card */}
        <Card className="w-full max-w-2xl bg-card border-border rounded-xl p-8 md:p-12">
          <div className="space-y-6">
            {/* Upload */}
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                disabled={isUploading}
              />
              <label
                htmlFor="file-upload"
                onClick={handleUploadLabelClick}
                className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-foreground/30 transition-colors"
              >
                <Upload className="w-12 h-12 mb-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground mb-1">
                  {file ? file.name : "Click to upload PNG"}
                </span>
                <span className="text-xs text-muted-foreground">PNG files only</span>
              </label>
            </div>

            {/* Uploaded thumbnail */}
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

            {/* Generate */}
            <div className="flex justify-end">
              <Button onClick={handleGenerate} disabled={!file || isUploading} className="h-10 rounded-xl">
                Generate
              </Button>
            </div>

            {/* Spinner (replaces progress bar) */}
            {isLoading && (
              <div className="flex items-center justify-center gap-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Generating stitches…</span>
              </div>
            )}

            {/* Errors */}
            {error && <div className="text-center text-sm text-destructive">{error}</div>}

            {/* Stitch preview + Buy buttons */}
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

      {/* Disclaimer modal */}
      {showDisclaimer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="max-w-lg w-full mx-4 rounded-xl bg-background p-6 shadow-lg border border-border">
            <h2 className="mb-2 text-lg font-semibold">Before you upload an image</h2>
            <div className="mb-4 space-y-2 text-sm text-muted-foreground max-h-64 overflow-y-auto">
              <p>By using Easy Digitizer, you agree that:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  You have the legal right to use, reproduce, and embroider any image you upload.
                  You won’t upload copyrighted or trademarked artwork you&apos;re not authorized to use.
                </li>
                <li>
                  You fully indemnify and hold Easy Digitizer and its owners harmless from any claims,
                  damages, or legal issues arising from your use of uploaded images or resulting embroidery files.
                </li>
                <li>
                  This is an experimental tool. We make no guarantees about how the file will stitch out
                  on your specific machine, fabric, or materials.
                </li>
                <li>
                  We are not responsible for any damage to embroidery machines, needles, garments, or materials
                  resulting from using the files generated by this site.
                </li>
              </ul>
              <p className="text-xs text-muted-foreground">
                If you do not agree to these terms, please do not upload images or use the generated embroidery files.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleDisclaimerCancel}
                className="px-3 py-1.5 text-sm rounded-lg border border-border"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDisclaimerAgree}
                className="px-3 py-1.5 text-sm rounded-lg bg-foreground text-background"
              >
                I Agree
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="container mx-auto px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            No subscriptions. Secure checkout with Stripe.
          </p>
        </div>
      </footer>
    </div>
  )
}
