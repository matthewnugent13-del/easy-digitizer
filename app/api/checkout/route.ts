import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { jobId, amount } = await req.json()
    if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 })

    const amountCents = Number(amount) || 99
    const secret = process.env.STRIPE_SECRET_KEY!
    const baseUrl = process.env.BASE_URL!

    const body = new URLSearchParams({
      mode: "payment",
      "success_url": `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      "cancel_url": `${baseUrl}`,
      // line item (dynamic price)
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": String(amountCents),
      "line_items[0][price_data][product_data][name]": "DST Download",
      "line_items[0][quantity]": "1",
      // metadata so we can look the job up after payment
      "metadata[jobId]": jobId,
    })

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    })

    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json({ error: data?.error?.message || "Stripe error" }, { status: 500 })
    }

    return NextResponse.json({ url: data.url })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "checkout failed" }, { status: 500 })
  }
}
