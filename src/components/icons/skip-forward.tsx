// https://lucide.dev/icons/arrow-right-to-line

type SkipForwardIconProps = {
  className?: string;
};

function SkipForwardIcon({ className }: SkipForwardIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="2"
      stroke="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M17 12H3" />
      <path d="m11 18 6-6-6-6" />
      <path d="M21 5v14" />
    </svg>
  );
}
export default SkipForwardIcon;
