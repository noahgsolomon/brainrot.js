"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@clerk/nextjs";
import { useYourVideos } from "./useyourvideos";
import { Button } from "@/components/ui/button";
import { useCreateVideo } from "./usecreatevideo";

export default function YourVideos({ visible = false }: { visible?: boolean }) {
  const user = useAuth();

  const { isOpen, setIsOpen } = useYourVideos();
  const { setIsOpen: setIsCreateVideoOpen } = useCreateVideo();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className=" rounded-lg sm:max-w-[425px]">
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
      </DialogContent>
    </Dialog>
  );
}
