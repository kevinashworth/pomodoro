import { ForwardIcon } from "@heroicons/react/24/outline";

type ForwardControlIconProps = {
  className?: string;
};

export function ForwardControlIcon({ className }: ForwardControlIconProps) {
  return <ForwardIcon aria-hidden="true" className={className} />;
}
