"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CheckCircle2, Download } from "lucide-react"
import Link from "next/link"

export default function SuccessPage() {
  const searchParams = useSearchParams()
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sessionId = searchParams.get("session_id")

    if (!sessionId) {
      setError("No session ID found")
      setIsLoading(false)
      return
    }

    const verifyAndLink = async () => {
      try {
        const res = await fetch(`/api/verify-and-link?session_id=${sessionId}`)
        const data = await res.json()

        if (data.url) {
          setDownloadUrl(data.url)
        } else {
          setError("Failed to retrieve download link")
        }
      } catch (err) {
        console.error("[v0] Verification error:", err)
        setError("Failed to verify payment")
      } finally {
        setIsLoading(false)
      }
    }

    verifyAndLink()
  }, [searchParams])

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <Link href="/">
            <h1 className="text-2xl font-semibold tracking-tight">Easy Digitizer</h1>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <Card className="w-full max-w-md bg-card border-border rounded-xl p-8 md:p-12">
          <div className="text-center space-y-6">
            {isLoading ? (
              <>
                <div className="w-16 h-16 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground">Verifying your payment...</p>
              </>
            ) : error ? (
              <>
                <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                  <span className="text-3xl">✕</span>
                </div>
                <h2 className="text-2xl font-bold">Payment Error</h2>
                <p className="text-muted-foreground">{error}</p>
                <Button asChild className="w-full rounded-xl">
                  <Link href="/">Return Home</Link>
                </Button>
              </>
            ) : downloadUrl ? (
              <>
                <div className="w-16 h-16 mx-auto">
                  <CheckCircle2 className="w-full h-full text-green-500" />
                </div>
                <h2 className="text-2xl font-bold">Payment Successful!</h2>
                <p className="text-muted-foreground">Your embroidery file is ready to download</p>
                <Button
                  asChild
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-12"
                >
                  <a href={downloadUrl} download>
                    <Download className="w-4 h-4 mr-2" />
                    Download DST File
                  </a>
                </Button>
                <Button asChild variant="outline" className="w-full rounded-xl bg-transparent">
                  <Link href="/">Convert Another File</Link>
                </Button>
              </>
            ) : null}
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
