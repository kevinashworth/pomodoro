import { XCircleIcon } from "@heroicons/react/24/outline";

type CloseIconProps = {
  className?: string;
};

export function CloseIcon({ className }: CloseIconProps) {
  return <XCircleIcon aria-hidden="true" className={className} />;
}
