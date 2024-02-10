"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useYourVideos } from "./useyourvideos";

export default function YourVideos({ visible = false }: { visible?: boolean }) {
  const { isOpen, setIsOpen } = useYourVideos();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className=" rounded-lg sm:max-w-[425px]">
        You have no videos
      </DialogContent>
    </Dialog>
  );
}
