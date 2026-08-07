import { ForwardIcon } from "@heroicons/react/24/outline";

type SkipForwardIconProps = {
  className?: string;
};

export function SkipForwardIcon({ className }: SkipForwardIconProps) {
  return <ForwardIcon aria-hidden="true" className={className} />;
}
