import { stripe } from "@/lib/stripe";
import { db } from "@/server/db";
import { brainrotusers } from "@/server/db/schemas/users/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { CREDIT_AMOUNTS } from "@/config/stripe";

export const dynamic = "force-dynamic";

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
    console.log("Webhook event constructed successfully", event.type);
  } catch (err) {
    console.error("Error constructing webhook event:", err);
    return new Response(
      `Webhook Error: ${err instanceof Error ? err.message : "Unknown Error"}`,
      { status: 400 },
    );
  }

  const session = event.data.object as Stripe.Checkout.Session;

  try {
    // Early return if no userId in metadata
    if (!session?.metadata?.userId) {
      console.log("Missing userId in session metadata");
      return new Response(null, { status: 200 });
    }

    // Handle successful checkouts
    if (event.type === "checkout.session.completed") {
      console.log("Handling checkout.session.completed event");

      // One-time payment (credit packs)
      if (session.mode === "payment" && session.metadata?.creditPacks) {
        const creditPacks = parseInt(session.metadata.creditPacks);
        const creditsToAdd = creditPacks * CREDIT_AMOUNTS.PACK_SIZE;

        const user = await db.query.brainrotusers.findFirst({
          where: eq(brainrotusers.id, parseInt(session.metadata.userId)),
        });

        if (!user) {
          console.error("User not found for credit pack purchase");
          return new Response(null, { status: 400 });
        }

        await db
          .update(brainrotusers)
          .set({
            credits: user.credits + creditsToAdd,
          })
          .where(eq(brainrotusers.id, user.id));

        console.log(`Added ${creditsToAdd} credits to user ${user.id}`);
      }
      // Subscription payment
      else if (session.mode === "subscription") {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string,
        );

        const user = await db.query.brainrotusers.findFirst({
          where: eq(brainrotusers.id, parseInt(session.metadata.userId)),
        });

        if (!user) {
          console.error("User not found for subscription");
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
            credits: user.credits + 250, // Monthly credits for subscription
          })
          .where(eq(brainrotusers.id, user.id));

        console.log("User subscription details updated successfully");
      }
    }

    // Handle successful subscription invoice payments
    if (event.type === "invoice.payment_succeeded") {
      console.log("Handling invoice.payment_succeeded event");

      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string,
      );

      const user = await db.query.brainrotusers.findFirst({
        where: eq(brainrotusers.stripeSubscriptionId, subscription.id),
      });

      if (user) {
        await db
          .update(brainrotusers)
          .set({
            stripePriceId: subscription.items.data[0]?.price.id,
            stripeCurrentPeriodEnd: new Date(
              subscription.current_period_end * 1000,
            ),
            subscribed: true,
            credits: user.credits + 250, // Refresh monthly credits
          })
          .where(eq(brainrotusers.id, user.id));

        console.log("User subscription renewed successfully");
      }
    }

    // Handle subscription cancellations
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;

      const userId = subscription.metadata?.userId;
      if (!userId) {
        console.error("Missing userId in subscription metadata");
        return new Response(null, { status: 400 });
      }

      await db
        .update(brainrotusers)
        .set({
          stripePriceId: null,
          stripeCurrentPeriodEnd: null,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          subscribed: false,
        })
        .where(
          eq(
            brainrotusers.id,
            parseInt(subscription.metadata.userId ?? "0") ?? 0,
          ),
        );

      console.log("User subscription deleted successfully");
    }

    // Handle subscription updates
    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;

      const userId = subscription.metadata?.userId;
      if (!userId) {
        console.error("Missing userId in subscription metadata");
        return new Response(null, { status: 400 });
      }

      const user = await db.query.brainrotusers.findFirst({
        where: eq(brainrotusers.id, parseInt(userId)),
      });

      if (user) {
        await db
          .update(brainrotusers)
          .set({
            credits: user.credits + 250,
          })
          .where(eq(brainrotusers.id, user.id));

        console.log("User subscription updated successfully");
      }
    }

    console.log("Webhook handling completed successfully");
    return new Response(null, { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(
      `Webhook Error: ${
        error instanceof Error ? error.message : "Unknown Error"
      }`,
      { status: 500 },
    );
  }
}
