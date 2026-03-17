import {
  normalizeCreateVideoSearchParams,
  type RawSearchParams,
} from "@/lib/create-video-search-params";
import SignUpPageClient from "./signup-page-client";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const resolvedSearchParams =
    normalizeCreateVideoSearchParams(await searchParams);

  return <SignUpPageClient searchParams={resolvedSearchParams} />;
}
