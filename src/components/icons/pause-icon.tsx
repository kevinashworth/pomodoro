import { PauseIcon } from "@heroicons/react/24/outline";

type PauseControlIconProps = {
  className?: string;
};

export function PauseControlIcon({ className }: PauseControlIconProps) {
  return <PauseIcon aria-hidden="true" className={className} />;
}
