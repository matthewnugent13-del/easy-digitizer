"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

type JobStatus = {
  status: "processing" | "completed" | "failed"
  previewUrl?: string
  error?: string
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Poll job status
  useEffect(() => {
    if (!jobId || jobStatus?.status === "completed" || jobStatus?.status === "failed") {
      return
    }

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/job-status?jobId=${jobId}`)
        const data = await res.json()
        setJobStatus(data)
      } catch (err) {
        console.error("[v0] Error polling job status:", err)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [jobId, jobStatus?.status])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setError(null)
    setIsUploading(true)
    setJobStatus(null)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)

      const res = await fetch("/api/start-job", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        throw new Error("Upload failed")
      }

      const data = await res.json()
      setJobId(data.jobId)
    } catch (err) {
      setError("Failed to upload file. Please try again.")
      console.error("[v0] Upload error:", err)
    } finally {
      setIsUploading(false)
    }
  }

  const handleCheckout = async (amount: number) => {
    if (!jobId) return

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, amount }),
      })

      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error("[v0] Checkout error:", err)
      setError("Checkout failed. Please try again.")
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-semibold tracking-tight">Easy Digitizer</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-12 max-w-2xl">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-balance">
            Upload a PNG → Preview stitches → Download DST.
          </h2>
          <p className="text-muted-foreground text-lg">Convert your designs to embroidery files in seconds</p>
        </div>

        {/* Upload Card */}
        <Card className="w-full max-w-2xl bg-card border-border rounded-xl p-8 md:p-12">
          <div className="space-y-6">
            {/* File Input */}
            <div className="relative">
              <input
                type="file"
                accept=".png"
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
                <span className="text-sm text-muted-foreground mb-1">{file ? file.name : "Click to upload PNG"}</span>
                <span className="text-xs text-muted-foreground">PNG files only</span>
              </label>
            </div>

            {/* Status Messages */}
            {isUploading && <div className="text-center text-sm text-muted-foreground">Uploading...</div>}

            {jobStatus?.status === "processing" && (
              <div className="text-center text-sm text-muted-foreground">Processing your design...</div>
            )}

            {error && <div className="text-center text-sm text-destructive">{error}</div>}

            {/* Preview Area */}
            {jobStatus?.previewUrl && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="rounded-xl overflow-hidden border border-border bg-secondary/50">
                  <img
                    src={jobStatus.previewUrl || "/placeholder.svg"}
                    alt="Stitch preview"
                    className="w-full h-auto"
                  />
                </div>

                {/* Purchase Buttons */}
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() => handleCheckout(0.99)}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-12"
                  >
                    Buy $0.99
                  </Button>
                  <Button
                    onClick={() => handleCheckout(2.99)}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-12"
                  >
                    Buy $2.99
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="container mx-auto px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">No subscriptions. Secure checkout with Stripe.</p>
        </div>
      </footer>
    </div>
  )
}
