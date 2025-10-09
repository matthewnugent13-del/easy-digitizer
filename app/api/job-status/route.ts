import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const jobId = searchParams.get("jobId")

  if (!jobId) {
    return NextResponse.json({ error: "No job ID provided" }, { status: 400 })
  }

  // TODO: Implement actual job status checking
  // For demo purposes, simulate processing then completion
  const jobCreatedTime = Number.parseInt(jobId.split("_")[1])
  const elapsedTime = Date.now() - jobCreatedTime

  if (elapsedTime < 3000) {
    // Processing for first 3 seconds
    return NextResponse.json({
      status: "processing",
    })
  } else {
    // Completed after 3 seconds with mock preview
    return NextResponse.json({
      status: "completed",
      previewUrl: "/embroidery-stitch-pattern-preview.jpg",
    })
  }
}
