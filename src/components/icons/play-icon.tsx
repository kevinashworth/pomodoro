import { PlayIcon } from "@heroicons/react/24/outline";

type PlayControlIconProps = {
  className?: string;
};

export function PlayControlIcon({ className }: PlayControlIconProps) {
  return <PlayIcon aria-hidden="true" className={className} />;
}
