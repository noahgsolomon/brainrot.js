import {
  normalizeCreateVideoSearchParams,
  type RawSearchParams,
} from "@/lib/create-video-search-params";
import AuthPageClient from "./auth-page-client";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const resolvedSearchParams =
    normalizeCreateVideoSearchParams(await searchParams);

  return <AuthPageClient searchParams={resolvedSearchParams} />;
}
