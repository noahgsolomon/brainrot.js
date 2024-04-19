import { authMiddleware } from "@clerk/nextjs";

// Use named export for authMiddleware
export default authMiddleware({
  publicRoutes: [
    "/",
    "/api/create",
    "/api/trpc/user.videoStatus",
    "/api/trpc/user.user",
    "/api/trpc/user.videoStatus,user.user",
    "/renders/((?!_next|static|favicon.ico).*)",
    "/api/webhooks/stripe",
    "/api/((?!_next|static|favicon.ico).*)",
  ],
  ignoredRoutes: ["/api/webhooks/stripe"],
});

export const config = {
  matcher: ["/((?!_next|static|favicon.ico).*)"],
};
