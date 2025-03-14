"use client";

import {
  MagicTweet,
  TweetNotFound,
  TweetSkeleton,
} from "@/components/magicui/tweet-card";
import { TweetProps, useTweet } from "react-tweet";

const ClientTweetCard = ({
  id,
  apiUrl,
  fallback = <TweetSkeleton />,
  components,
  fetchOptions,
  onError,
  video,
  pfp,
  ...props
}: TweetProps & { className?: string; video?: string; pfp?: string }) => {
  const { data, error, isLoading } = useTweet(id, apiUrl, fetchOptions);

  if (isLoading) return fallback;
  if (error || !data) {
    const NotFound = components?.TweetNotFound || TweetNotFound;
    return <NotFound error={onError ? onError(error) : error} />;
  }

  return (
    <MagicTweet
      tweet={data}
      components={components}
      video={video}
      pfp={pfp}
      {...props}
    />
  );
};

export default ClientTweetCard;
