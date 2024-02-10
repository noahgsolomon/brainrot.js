import { createTRPCRouter } from "@/server/api/trpc";
import { userRouter } from "./routers/users";

export const appRouter = createTRPCRouter({
  user: userRouter,
});

export type AppRouter = typeof appRouter;
