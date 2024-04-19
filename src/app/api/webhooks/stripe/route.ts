import { stripe } from "@/lib/stripe";
import { db } from "@/server/db";
import { brainrotusers } from "@/server/db/schemas/users/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import type Stripe from "stripe";

export async function POST(request: Request) {
  console.log("Received webhook request");

  const body = await request.text();
  const signature = headers().get("stripe-signature") ?? "";
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET ?? "",
    );
    console.log("Webhook event constructed successfully");
  } catch (err) {
    console.error("Error constructing webhook event:", err);
    return new Response(
      `Webhook Error: ${err instanceof Error ? err.message : "Unknown Error"}`,
      { status: 400 },
    );
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (!session?.metadata?.userId) {
    console.log("Missing userId in session metadata");
    return new Response(null, { status: 200 });
  }

  if (event.type === "checkout.session.completed") {
    console.log("Handling checkout.session.completed event");
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string,
    );

    const user = await db.query.brainrotusers.findFirst({
      where: eq(brainrotusers.id, parseInt(session.metadata.userId)),
    });

    if (!user) {
      return new Response(null, { status: 400 });
    }

    console.log("Updating user subscription details in the database");
    await db
      .update(brainrotusers)
      .set({
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer as string,
        stripePriceId: subscription.items.data[0]?.price.id,
        stripeCurrentPeriodEnd: new Date(
          subscription.current_period_end * 1000,
        ),
        subscribed: true,
        credits: user.credits + 250,
      })
      .where(eq(brainrotusers.id, user.id));

    console.log("User subscription details updated successfully");
  }

  if (event.type === "invoice.payment_succeeded") {
    console.log("Handling invoice.payment_succeeded event");
    // Retrieve the subscription details from Stripe.
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string,
    );

    console.log("Updating user subscription details in the database");
    await db
      .update(brainrotusers)
      .set({
        stripePriceId: subscription.items.data[0]?.price.id,
        stripeCurrentPeriodEnd: new Date(
          subscription.current_period_end * 1000,
        ),
        subscribed: true,
      })
      .where(eq(brainrotusers.stripeSubscriptionId, subscription.id));

    console.log("User subscription details updated successfully");
  }

  console.log("Webhook handling completed");
  return new Response(null, { status: 200 });
}
