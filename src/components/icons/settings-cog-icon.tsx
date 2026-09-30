import { Cog6ToothIcon } from "@heroicons/react/24/outline";

type SettingsCogIconProps = {
  className?: string;
};

export function SettingsCogIcon({ className }: SettingsCogIconProps) {
  return <Cog6ToothIcon aria-hidden="true" className={className} />;
}
