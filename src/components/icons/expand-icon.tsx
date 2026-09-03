import { ArrowsPointingOutIcon } from "@heroicons/react/24/outline";

type ExpandIconProps = {
  className?: string;
};

export function ExpandIcon({ className }: ExpandIconProps) {
  return <ArrowsPointingOutIcon aria-hidden="true" className={className} />;
}
