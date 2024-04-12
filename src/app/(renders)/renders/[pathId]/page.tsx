export default function Page({ params }: { params: { pathId: string } }) {
  return (
    <iframe
      src={`https://videos.brainrotjs.com/renders/${params.pathId}/out.mp4`}
    />
  );
}
