/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */
import { auth } from "@clerk/nextjs/server";
import { TRPCError, initTRPC } from "@trpc/server";
import { type NextRequest } from "next/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { db } from "@/server/db";
import { brainrotusers } from "../db/schemas/users/schema";
import { eq, or } from "drizzle-orm";

interface CreateContextOptions {
  headers: Headers;
}

export const createInnerTRPCContext = (opts: CreateContextOptions) => {
  return {
    headers: opts.headers,
    db,
  };
};

export const createTRPCContext = (opts: { req: NextRequest }) => {
  return createInnerTRPCContext({
    headers: opts.req.headers,
  });
};
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;

export const publicProcedure = t.procedure;

const isAuthed = t.middleware(async ({ next }) => {
  const user = auth();
  if (!user?.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  const userIdsFromDB = await db.query.brainrotusers.findFirst({
    where: eq(brainrotusers.clerk_id, user.userId),
  });

  const userId = userIdsFromDB?.id ?? -1;

  return next({
    ctx: {
      user,
      user_id: userId,
    },
  });
});

const isSubscribed = t.middleware(async ({ next }) => {
  const user = auth();
  if (!user?.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const userFromDB = await db.query.brainrotusers.findFirst({
    where: eq(brainrotusers.clerk_id, user.userId),
  });

  if (!userFromDB || !userFromDB.subscribed) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      user,
      user_id: userFromDB.id,
    },
  });
});

// export this procedure to be used anywhere in your application
export const protectedProcedure = t.procedure.use(isAuthed);
export const subscribedProcedure = t.procedure.use(isSubscribed);
