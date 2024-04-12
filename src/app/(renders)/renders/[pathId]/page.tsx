export default function Page({ params }: { params: { pathId: string } }) {
  return (
    <iframe
      src={`https://videos.brainrotjs.com/renders/${params.pathId}/out.mp4`}
      allowFullScreen
      width="100%"
      height="100%"
    />
  );
}
