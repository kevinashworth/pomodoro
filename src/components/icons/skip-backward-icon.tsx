// import { SkipIcon } from "@heroicons/react/24/outline";
// see https://github.com/tailwindlabs/heroicons/pull/998 for the skip icon

type SkipBackwardIconProps = {
  className?: string;
};

export function SkipBackwardIcon({ className }: SkipBackwardIconProps) {
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
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 5.5V18m14-1.189V6.69c0-.864-.933-1.406-1.683-.977l-8.108 5.061a1.127 1.127 0 000 1.954l8.108 5.061A1.124 1.124 0 0019 16.811z"
      />
    </svg>
  );
}
