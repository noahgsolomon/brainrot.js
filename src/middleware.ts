import { authMiddleware } from "@clerk/nextjs";

// Use named export for authMiddleware
export default authMiddleware({
  publicRoutes: ["/"],
});

export const config = {
  matcher: ["/((?!_next|static|favicon.ico).*)"],
};
