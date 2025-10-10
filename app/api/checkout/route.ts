import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

export async function POST(req: NextRequest) {
  const { jobId, amount } = await req.json()
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 })

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" })
  const lineItem = {
    price_data: {
      currency: "usd",
      unit_amount: Number(amount) || 99, // cents -> $0.99
      product_data: { name: "DST Download" },
    },
    quantity: 1,
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [lineItem as any],
    success_url: `${process.env.BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.BASE_URL}`,
    metadata: { jobId },
  })

  return NextResponse.json({ url: session.url })
}
