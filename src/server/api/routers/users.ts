import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import {
  brainrotusers,
  pendingVideos,
  rapAudio,
  videos,
} from "@/server/db/schemas/users/schema";
import { eq, or, sql } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import OpenAI from "openai";
import { absoluteUrl } from "@/lib/utils";
import { getUserSubscriptionPlan, stripe } from "@/lib/stripe";
import { PLANS, getPriceId } from "@/config/stripe";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

let accessToken: string | null = null;
let tokenExpiration: number = 0;

async function getSpotifyToken() {
  if (accessToken && tokenExpiration > Date.now()) {
    return accessToken;
  }

  console.log("Getting new Spotify token...");
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.SPOTIFY_CLIENT_ID!,
      client_secret: process.env.SPOTIFY_CLIENT_SECRET!,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Token error:", data);
    throw new Error(`Failed to get token: ${data.error}`);
  }

  console.log("Got new token, expires in:", data.expires_in);
  accessToken = data.access_token;
  tokenExpiration = Date.now() + data.expires_in * 1000;
  return accessToken;
}

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
          credits: 0,
          apiKey: generateRandomString(255),
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

  userRapAudio: protectedProcedure.query(async ({ ctx }) => {
    const userRapAudioDb = await ctx.db.query.rapAudio.findMany({
      where: eq(rapAudio.user_id, ctx.user_id),
      orderBy: (rapAudio, { desc }) => [desc(rapAudio.id)],
    });

    return { rapAudio: userRapAudioDb };
  }),

  getVideos: publicProcedure
    .input(z.object({ page: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const userVideosDb = await ctx.db.query.videos.findMany({
        limit: 15,
        orderBy: sql`rand()`,
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
        outputType: z.enum(["video", "audio"]).optional().default("video"),
        mode: z
          .enum(["brainrot", "podcast", "monologue", "rap"])
          .optional()
          .default("brainrot"),
        trackId: z.string().optional(),
      }),
    )
    .mutation(
      async ({
        ctx,
        input: {
          title,
          agent1,
          agent2,
          remainingCredits,
          cost,
          outputType,
          mode,
          trackId,
        },
      }) => {
        try {
          const [validityResponse, commentResponse] = await Promise.all([
            openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: `Assess the legibility of the following title: "${title}". If the title consists of random characters (e.g., "c3fwgerwfg"), return a JSON object with 'valid': false. Otherwise, return a JSON object with 'valid': true.`,
                },
              ],
              response_format: { type: "json_object" },
            }),
            openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: `Analyze if the following topic is offensive or controversial: "${title}".
                  If it is, respond with a short, witty reaction comment (max 45 chars) following these guidelines:
                  - Use internet slang, emojis, or popular meme references
                  - Mix shock, humor, and mild disapproval
                  - Unless an emojis is directly applicable, don't use one or just use a skull or crying emoji
                  - Examples:
                    "The hell is wrong with you 😭"
                    "bro chose violence today 💀"
                    "my brother in christ... WHY ⁉️"
                    "FBI OPEN UP 🚔"
                    "touch grass immediately"
                    "down astronomical rn 📉"
                  If not offensive, return empty string. Return as JSON with 'comment' field.`,
                },
              ],
              response_format: { type: "json_object" },
            }),
          ]);

          const argumentsData = JSON.parse(
            validityResponse.choices[0]?.message.content ?? "{}",
          );
          const commentData = JSON.parse(
            commentResponse.choices[0]?.message.content ?? "{}",
          );

          if (!argumentsData.valid) {
            return {
              valid: false,
              comment: commentData.comment || null,
            };
          }

          // Fetch lyrics and download URL for rap mode
          let lyrics = null;
          let downloadUrl = null;

          if (mode === "rap" && trackId) {
            try {
              const lyricsResponse = await fetch(
                `${
                  process.env.MODE === "LOCAL"
                    ? "http://localhost:3000"
                    : `https://${process.env.WEBSITE}`
                }/api/spotify/lyrics`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ id: trackId }),
                },
              );

              if (lyricsResponse.ok) {
                const lyricsData = await lyricsResponse.json();
                lyrics = lyricsData.lyrics || null;
              }

              const trackResponse = await fetch(
                `https://api.spotify.com/v1/tracks/${trackId}`,
                {
                  headers: {
                    authorization: `Bearer ${await getSpotifyToken()}`,
                    Accept: "application/json",
                  },
                },
              );

              if (trackResponse.ok) {
                const trackData = await trackResponse.json();
                const downloadResponse = await fetch(
                  `${
                    process.env.MODE === "LOCAL"
                      ? "http://localhost:3000"
                      : `https://${process.env.WEBSITE}`
                  }/api/spotify/download`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      url: trackData.external_urls.spotify,
                    }),
                  },
                );

                if (downloadResponse.ok) {
                  const downloadData = await downloadResponse.json();
                  downloadUrl = downloadData.medias[0].url || null;
                }
              }
            } catch (error) {
              console.error("Error fetching lyrics or download URL:", error);
            }
          }

          await ctx.db
            .update(brainrotusers)
            .set({ credits: remainingCredits - cost })
            .where(eq(brainrotusers.id, ctx.user_id));

          const user = await ctx.db.query.brainrotusers.findFirst({
            where: eq(brainrotusers.id, ctx.user_id),
          });

          return {
            valid: true,
            apiKey: user?.apiKey,
            comment: commentData.comment || null,
            lyrics,
            downloadUrl,
            mode,
          };
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      },
    ),

  createCreditPackSession: protectedProcedure
    .input(
      z.object({
        creditPacks: z.number().min(1).max(10),
        searchParams: z
          .object({
            agent1Id: z.string().optional(),
            agent2Id: z.string().optional(),
            agent1Name: z.string().optional(),
            agent2Name: z.string().optional(),
            title: z.string().optional(),
            credits: z.string().optional(),
            music: z.string().optional(),
            background: z.string().optional(),
            assetType: z.string().optional(),
            duration: z.string().optional(),
            fps: z.string().optional(),
          })
          .optional(),
        searchQueryString: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const searchParams = input?.searchParams ?? {};
      const searchQueryString = input?.searchQueryString
        ? input?.searchQueryString
        : `?agent1Id=${encodeURIComponent(
            searchParams.agent1Id || "",
          )}&agent2Id=${encodeURIComponent(
            searchParams.agent2Id || "",
          )}&agent1Name=${encodeURIComponent(
            searchParams.agent1Name || "",
          )}&agent2Name=${encodeURIComponent(
            searchParams.agent2Name || "",
          )}&title=${encodeURIComponent(
            searchParams.title || "",
          )}&credits=${encodeURIComponent(
            searchParams.credits || "",
          )}&music=${encodeURIComponent(
            searchParams.music || "",
          )}&background=${encodeURIComponent(
            searchParams.background || "",
          )}&assetType=${encodeURIComponent(
            searchParams.assetType || "",
          )}&duration=${encodeURIComponent(
            searchParams.duration || "",
          )}&fps=${encodeURIComponent(searchParams.fps || "")}`;

      const dbUser = await ctx.db.query.brainrotusers.findFirst({
        where: eq(brainrotusers.id, ctx.user_id),
      });

      if (!dbUser) {
        throw new Error("User not found");
      }

      const session = await stripe.checkout.sessions.create({
        success_url: absoluteUrl(`/${searchQueryString}`),
        cancel_url: absoluteUrl(`/${searchQueryString}`),
        payment_method_types: ["card"],
        mode: "payment",
        billing_address_collection: "auto",
        line_items: [
          {
            price: getPriceId("creditPack"),
            quantity: input.creditPacks,
          },
        ],
        metadata: {
          userId: ctx.user_id,
          creditPacks: input.creditPacks,
        },
      });

      return { url: session.url };
    }),

  // Mutation to create a Stripe checkout session for the user
  createStripeSession: protectedProcedure
    .input(
      z
        .object({
          searchParams: z
            .object({
              agent1Id: z.string().optional(),
              agent2Id: z.string().optional(),
              agent1Name: z.string().optional(),
              agent2Name: z.string().optional(),
              title: z.string().optional(),
              credits: z.string().optional(),
              music: z.string().optional(),
              background: z.string().optional(),
              assetType: z.string().optional(),
              duration: z.string().optional(),
              fps: z.string().optional(),
            })
            .optional(),
          searchQueryString: z.string().optional(),
        })
        .optional(),
    )
    .mutation(async ({ ctx, input }) => {
      const searchParams = input?.searchParams ?? {};
      const searchQueryString = input?.searchQueryString
        ? input?.searchQueryString
        : `?agent1Id=${encodeURIComponent(
            searchParams.agent1Id || "",
          )}&agent2Id=${encodeURIComponent(
            searchParams.agent2Id || "",
          )}&agent1Name=${encodeURIComponent(
            searchParams.agent1Name || "",
          )}&agent2Name=${encodeURIComponent(
            searchParams.agent2Name || "",
          )}&title=${encodeURIComponent(
            searchParams.title || "",
          )}&credits=${encodeURIComponent(
            searchParams.credits || "",
          )}&music=${encodeURIComponent(
            searchParams.music || "",
          )}&background=${encodeURIComponent(
            searchParams.background || "",
          )}&assetType=${encodeURIComponent(
            searchParams.assetType || "",
          )}&duration=${encodeURIComponent(
            searchParams.duration || "",
          )}&fps=${encodeURIComponent(searchParams.fps || "")}`;

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
        success_url: absoluteUrl(`/${searchQueryString}`),
        cancel_url: absoluteUrl(`/${searchQueryString}`),
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
        subscription_data: {
          metadata: {
            userId: ctx.user_id,
          },
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
  disconnectTwitter: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(brainrotusers)
      .set({
        twitter_handle: null,
        twitter_id: null,
      })
      .where(eq(brainrotusers.clerk_id, ctx.user.userId));

    return { success: true };
  }),
});
