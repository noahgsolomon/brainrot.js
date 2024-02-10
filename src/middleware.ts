import { authMiddleware } from "@clerk/nextjs";

// Use named export for authMiddleware
export default authMiddleware({
  publicRoutes: ["/", "/api/create"],
});

export const config = {
  matcher: ["/((?!_next|static|favicon.ico).*)"],
};
