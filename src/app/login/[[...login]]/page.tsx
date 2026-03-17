import {
  normalizeCreateVideoSearchParams,
  type RawSearchParams,
} from "@/lib/create-video-search-params";
import LoginPageClient from "./login-page-client";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const resolvedSearchParams =
    normalizeCreateVideoSearchParams(await searchParams);

  return <LoginPageClient searchParams={resolvedSearchParams} />;
}
