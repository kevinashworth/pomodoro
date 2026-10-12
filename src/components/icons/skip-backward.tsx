// https://lucide.dev/icons/arrow-left-to-line

type SkipBackwardIconProps = {
  className?: string;
};

function SkipBackwardIcon({ className }: SkipBackwardIconProps) {
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
      <path d="M3 19V5" />
      <path d="m13 6-6 6 6 6" />
      <path d="M7 12h14" />
    </svg>
  );
}

export default SkipBackwardIcon;
