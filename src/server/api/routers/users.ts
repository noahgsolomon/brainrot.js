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
        });
      }
    }
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
        (v) => v.timestamp! < videos.timestamp!,
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
                content:
                  title !== "RANDOM"
                    ? `Assess the user's request for an academic or educational or entertainment note on the topic '${title}'. Verify if the topic is suitable for an educational or entertainment context. The criteria for a valid topic include appropriateness, educational value, or entertainment, and the potential for an in-depth exploration of at least 1,000 words. If the topic fails to meet these criteria (i.e., it is inappropriate, offensive, lacks educational value and is not for entertainment purposes), return a JSON object with 'valid': false. For valid topics, return a JSON object with 'valid': true, a 'description' of the topic of in 1 short sentence, the 'title' of the topic, 'nextTopic' being a topic that would be a good progression or next step from this one, and the appropriate 'category'. The category must be one of the following: ENGLISH, MATH, SCIENCE, HISTORY, ARTS, MUSIC, LITERATURE, PHILOSOPHY, GEOGRAPHY, SOCIAL STUDIES, PHYSICAL EDUCATION, COMPUTER SCIENCE, ECONOMICS, BUSINESS STUDIES, PSYCHOLOGY, LAW, POLITICAL SCIENCE, ENVIRONMENTAL SCIENCE, ENGINEERING, MEDICINE, AGRICULTURE, ASTRONOMY, ENTERTAINMENT, OTHER. Ensure the category is an exact match from these options.`
                    : `Create a random educational topic that is detailed and precise, very specific like for example: "Encoding Sentences Using Transformer Models" or "The Assassination of Julius Caesar: A Detailed Account" or "Investigating the Gut Microbiome's Influence on Overall Wellness" or "Decoding Ancient Scripts: The Rosetta Stone's Role in Understanding Hieroglyphics" or "Delving into Chaos Theory: The Butterfly Effect and Predictability in Complex Systems" or "Unveiling Geometry in Art: The Mathematical Structure in M.C. Escher's Work" or "The Rise of Quantum Algorithms: Breaking the Boundaries of Classical Computing" or "The Intricacies of Cryptocurrency Mining and Blockchain Technology". The topic should not be broad; it must be specific and niche, offering a focused subject for in-depth exploration. It should be something hyper-specific, fascinating, and intellectually stimulating. In one of these categories: ENGLISH, MATH, SCIENCE, HISTORY, ARTS, MUSIC, LITERATURE, PHILOSOPHY, GEOGRAPHY, SOCIAL STUDIES, PHYSICAL EDUCATION, COMPUTER SCIENCE, ECONOMICS, BUSINESS STUDIES, PSYCHOLOGY, LAW, POLITICAL SCIENCE, ENVIRONMENTAL SCIENCE, ENGINEERING, MEDICINE, AGRICULTURE, ASTRONOMY, ENTERTAINMENT, OTHER. Return a JSON object with 'valid': true, a 'description' of the topic of in 1 short sentence, the 'title' of the topic, 'nextTopic' being a topic that would be a good progression or next step from this one, and the appropriate 'category'. The category must be one of the categories above. Ensure the category is an exact match from these options.`,
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
    const userId = ctx.user_id;

    const billingUrl = absoluteUrl("?subscribed=true");

    // Ensure the userId is available
    if (!userId) {
      throw new Error("No user ID");
    }

    // Retrieve the user from the database
    const dbUser = await ctx.db.query.brainrotusers.findFirst({
      where: eq(brainrotusers.id, userId),
    });

    if (!dbUser) {
      throw new Error("No user found");
    }

    const subscriptionPlan = await getUserSubscriptionPlan();

    // If the user is already subscribed and has a Stripe customer ID, create a billing portal session
    if (subscriptionPlan.isSubscribed && dbUser.stripeCustomerId) {
      const session = await stripe.billingPortal.sessions.create({
        customer: dbUser.stripeCustomerId,
        return_url: billingUrl,
      });

      return { url: session.url };
    }

    console.log(subscriptionPlan);

    // Otherwise, create a new Stripe checkout session for a subscription
    const session = await stripe.checkout.sessions.create({
      success_url: billingUrl,
      cancel_url: billingUrl,
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
        userId: userId,
      },
    });

    console.log(session.url);

    return { url: session.url };
  }),
});
