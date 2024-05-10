import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import {
  brainrotusers,
  pendingVideos,
  videos,
} from "@/server/db/schemas/users/schema";
import { eq, or } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs";
import { z } from "zod";
import OpenAI from "openai";
import { absoluteUrl } from "@/lib/utils";
import { getUserSubscriptionPlan, stripe } from "@/lib/stripe";
import { PLANS } from "@/config/stripe";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to generate a random string of specified length
function generateRandomString(length: number) {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    result += charset.charAt(randomIndex);
  }
  return result;
}

export const userRouter = createTRPCRouter({
  deletePendingVideo: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(pendingVideos).where(eq(pendingVideos.id, input.id));
    }),
  // Mutation to check if a user exists in the database and create a new user if not
  exists: protectedProcedure.mutation(async ({ ctx }) => {
    const clerkUser = await currentUser();
    if (clerkUser) {
      // Check if the user already exists in the database
      const user = await ctx.db
        .select()
        .from(brainrotusers)
        .where(
          or(
            eq(
              brainrotusers.email,
              clerkUser.emailAddresses[0]?.emailAddress ??
                "empty@nonexistent.com",
            ),
            eq(brainrotusers.clerk_id, clerkUser.id),
          ),
        );

      // If the user does not exist, create a new user record
      if (user.length === 0) {
        await ctx.db.insert(brainrotusers).values({
          name: clerkUser.firstName + " " + clerkUser.lastName,
          email: clerkUser.emailAddresses[0]?.emailAddress ?? clerkUser.id,
          clerk_id: clerkUser.id,
          username:
            clerkUser.emailAddresses[0]?.emailAddress.split("@")[0] ??
            generateRandomString(10),
          credits: 20,
        });
      }
    }
  }),
  cancelPendingVideo: protectedProcedure
    .input(z.object({ id: z.number(), credits: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(pendingVideos).where(eq(pendingVideos.id, input.id));
      const user = await ctx.db.query.brainrotusers.findFirst({
        where: eq(brainrotusers.id, ctx.user_id),
      });
      await ctx.db
        .update(brainrotusers)
        .set({ credits: user?.credits! + input.credits })
        .where(eq(brainrotusers.id, ctx.user_id));
    }),
  findVideo: publicProcedure
    .input(z.object({ url: z.string() }))
    .query(async ({ ctx, input }) => {
      const video = await ctx.db.query.videos.findFirst({
        where: eq(videos.url, input.url),
      });

      return { video };
    }),

  // Mutation to delete a user from the database
  delete: protectedProcedure.mutation(async ({ ctx }) => {
    // Use a transaction to safely delete the user
    await ctx.db.transaction(async (trx) => {
      await trx.delete(brainrotusers).where(eq(brainrotusers.id, ctx.user_id));
    });
    return { status: "OK" };
  }),

  // Query to retrieve the current user's details
  user: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.query.brainrotusers.findFirst({
      where: eq(brainrotusers.id, ctx.user_id),
    });

    return { user: user };
  }),

  videoStatus: protectedProcedure.query(async ({ ctx }) => {
    const videos = await ctx.db.query.pendingVideos.findFirst({
      where: eq(pendingVideos.user_id, ctx.user_id),
    });

    if (videos) {
      const allVideos = await ctx.db.query.pendingVideos.findMany({
        orderBy: (pendingVideos, { asc }) => [asc(pendingVideos.timestamp)],
      });
      const queueLength = allVideos.filter(
        (v) => v.timestamp! < videos.timestamp! && v.processId === -1,
      ).length;
      return { videos: videos, queueLength };
    } else return { videos: null };
  }),
  // Mutation to update the current user's username
  setUsername: protectedProcedure
    .input(
      z.object({
        username: z.string().min(3).max(20),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if username is valid
      if (!input.username) {
        return {
          data: null,
          status: "ERROR",
          message: "Username must be at least 3 characters",
        };
      }
      // Check if username already exists
      const user = await ctx.db.query.brainrotusers.findFirst({
        where: eq(brainrotusers.username, input.username),
      });
      if (user) {
        return {
          data: null,
          status: "ERROR",
          message: "Username already exists",
        };
      }
      // Update the username
      await ctx.db
        .update(brainrotusers)
        .set({
          username: input.username,
        })
        .where(eq(brainrotusers.id, ctx.user_id));

      return {
        data: input.username,
        status: "OK",
        message: "username has been changed.",
      };
    }),

  userVideos: protectedProcedure.query(async ({ ctx }) => {
    const userVideosDb = await ctx.db.query.videos.findMany({
      where: eq(videos.user_id, ctx.user_id),
      orderBy: (videos, { desc }) => [desc(videos.id)],
      limit: 3,
    });

    return { videos: userVideosDb };
  }),

  newUserVideo: protectedProcedure.query(async ({ ctx }) => {
    const userVideosDb = await ctx.db.query.videos.findMany({
      where: eq(videos.user_id, ctx.user_id),
      orderBy: (videos, { desc }) => [desc(videos.id)],
      limit: 1,
    });

    return { videos: userVideosDb };
  }),

  // Mutation to update the current user's name
  setName: protectedProcedure
    .input(
      z.object({
        name: z.string().min(3).max(75),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if name is valid
      if (!input.name) {
        return {
          data: null,
          status: "ERROR",
          message: "name must be at least 3 characters",
        };
      }
      // Update the name
      await ctx.db
        .update(brainrotusers)
        .set({
          name: input.name,
        })
        .where(eq(brainrotusers.id, ctx.user_id));

      return {
        data: input.name,
        status: "OK",
        message: "name has been changed.",
      };
    }),

  createVideo: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        agent1: z.number(),
        agent2: z.number(),
        remainingCredits: z.number(),
        cost: z.number(),
      }),
    )
    .mutation(
      async ({
        ctx,
        input: { title, agent1, agent2, remainingCredits, cost },
      }) => {
        try {
          const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo-1106",
            messages: [
              {
                role: "system",
                content: `Assess the legibility of the following title: "${title}". If the title is unintelligible or consists of random characters (e.g., "c3fwgerwfg"), return a JSON object with 'valid': false. Otherwise, return a JSON object with 'valid': true. The title can be risque or somewhat humorfully offensive but if it crosses a line and you think it is too far, return a JSON object with 'valid': false.`,
              },
            ],

            response_format: { type: "json_object" },
          });

          const argumentsData = JSON.parse(
            response.choices[0]?.message.content ?? "{}",
          );

          if (!argumentsData.valid) {
            return { valid: false };
          }

          await ctx.db
            .update(brainrotusers)
            .set({ credits: remainingCredits - cost })
            .where(eq(brainrotusers.id, ctx.user_id));

          return { valid: true };
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      },
    ),

  // Mutation to create a Stripe checkout session for the user
  createStripeSession: protectedProcedure.mutation(async ({ ctx }) => {
    console.log("HIT CREATE STRIPE SESSION");
    // Retrieve the user from the database
    const dbUser = await ctx.db.query.brainrotusers.findFirst({
      where: eq(brainrotusers.id, ctx.user_id),
    });

    if (!dbUser) {
      throw new Error("No user found");
    }
    console.log("FOUND USER");

    const subscriptionPlan = await getUserSubscriptionPlan();

    console.log("FOUND SUBSCRIPTION PLAN");
    console.log(subscriptionPlan);

    // If the user is already subscribed and has a Stripe customer ID, create a billing portal session
    if (subscriptionPlan.isSubscribed && dbUser.stripeCustomerId) {
      const session = await stripe.billingPortal.sessions.create({
        customer: dbUser.stripeCustomerId,
        return_url: absoluteUrl("/"),
      });

      console.log(JSON.stringify(session, null, 2));

      return { url: session.url };
    }

    console.log(subscriptionPlan);

    console.log("about to create session");

    // Otherwise, create a new Stripe checkout session for a subscription
    const session = await stripe.checkout.sessions.create({
      success_url: absoluteUrl("/?subscribed=true"),
      cancel_url: absoluteUrl("/"),
      payment_method_types: ["card"],
      mode: "subscription",
      billing_address_collection: "auto",
      line_items: [
        {
          price: PLANS.find((plan) => plan.slug === "pro")?.price.priceIds
            .production,
          quantity: 1,
        },
      ],
      metadata: {
        userId: ctx.user_id,
      },
    });

    console.log("created session!");

    console.log(session.url);

    return { url: session.url };
  }),
  getSubscriptionPlan: protectedProcedure.query(async ({ ctx }) => {
    const subscriptionPlan = await getUserSubscriptionPlan();
    return subscriptionPlan;
  }),
});
