import { cn } from "@/lib/utils";

export default function ProductHuntIcon({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 256 256"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient x1="50%" y1="0%" x2="50%" y2="100%" id="a">
          <stop stop-color="#DA552F" offset="0%" />
          <stop stop-color="#D04B25" offset="100%" />
        </linearGradient>
      </defs>
      <g fill="none" fill-rule="evenodd">
        <path
          d="M128 256c70.694 0 128-57.306 128-128S198.694 0 128 0 0 57.306 0 128s57.306 128 128 128z"
          fill="url(#a)"
        />
        <path
          d="M96 76.8v102.4h19.2v-32h29.056c19.296-.512 34.944-16.16 34.944-35.2 0-19.552-15.648-35.2-34.944-35.2H96zm48.493 51.2H115.2V96h29.293c8.563 0 15.507 7.168 15.507 16s-6.944 16-15.507 16z"
          fill="#FFF"
        />
      </g>
    </svg>
  );
}
