"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@clerk/nextjs";
import { useYourVideos } from "./useyourvideos";
import { useCreateVideo } from "./usecreatevideo";
import { trpc } from "@/trpc/client";
import { useEffect, useState } from "react";

export default function YourVideos({ visible = false }: { visible?: boolean }) {
  const user = useAuth();

  const { isOpen, setIsOpen, refetchVideos, setRefetchVideos } =
    useYourVideos();
  const { setIsOpen: setIsCreateVideoOpen } = useCreateVideo();

  const userVideosQuery = trpc.user.userVideos.useQuery();

  useEffect(() => {
    if (refetchVideos) {
      userVideosQuery.refetch();
      setRefetchVideos(false);
    }
  }, [refetchVideos]);

  const [videos, setVideos] = useState(userVideosQuery.data?.videos ?? []);

  useEffect(() => {
    setVideos(userVideosQuery.data?.videos ?? []);
  }, [userVideosQuery.data?.videos]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className=" rounded-lg sm:max-w-[425px]">
        {userVideosQuery.isFetched && videos.length > 0 ? (
          <div className="flex flex-col items-center justify-center">
            {videos.map((video) => (
              <>
                <p className="font-bold underline">{video.title}</p>
                <p className="">
                  <span className="font-bold">
                    {video.agent1
                      .split("_")
                      .map(
                        (word) => word.charAt(0) + word.slice(1).toLowerCase(),
                      )
                      .join(" ")}
                  </span>{" "}
                  and{" "}
                  <span className="font-bold">
                    {video.agent2
                      .split("_")
                      .map(
                        (word) => word.charAt(0) + word.slice(1).toLowerCase(),
                      )
                      .join(" ")}
                  </span>
                </p>
                <video
                  className="scale-[90%] rounded-lg border shadow-md transition-all"
                  width={300}
                  height={300}
                  src={video.url}
                  loop
                  muted
                  controls
                ></video>
              </>
            ))}
          </div>
        ) : (
          <>
            You have no videos
            <div>
              Click{" "}
              <span
                onClick={() => {
                  setIsOpen(false);
                  setIsCreateVideoOpen(true);
                }}
                className="cursor-pointer font-bold underline transition-all hover:opacity-80"
              >
                here
              </span>{" "}
              to create a video.
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
