import { useState } from "react";
import { Link } from "react-router-dom";

import Button, { variants } from "@/components/button";
import ButtonGroup from "@/components/button-group";
import PlaygroundDialog from "@/components/playground-dialog";

import type { ButtonVariant } from "@/components/button";

const colors = Object.keys(variants) as ButtonVariant[];
const initialColor = colors[0] as ButtonVariant;

function PlaygroundPage() {
  const [longColor, setLongColor] = useState<ButtonVariant>(initialColor);

  function handleChangeColor() {
    setLongColor((currentColor) => {
      const availableColors = colors.filter((color) => color !== currentColor);
      const randomIndex = Math.floor(Math.random() * availableColors.length);
      return availableColors[randomIndex] ?? initialColor;
    });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_20%_12%,rgba(255,187,170,0.34),transparent_45%),radial-gradient(circle_at_82%_88%,rgba(165,225,210,0.28),transparent_42%),linear-gradient(140deg,#f8f6f1_0%,#f2efea_54%,#ebe7df_100%)] px-4 py-8 dark:bg-[radial-gradient(circle_at_20%_12%,rgba(205,102,96,0.21),transparent_45%),radial-gradient(circle_at_82%_88%,rgba(81,154,137,0.24),transparent_42%),linear-gradient(140deg,#1a1a1a_0%,#141414_54%,#101010_100%)]">
      <main className="w-full max-w-md rounded-2xl border border-zinc-300 p-4">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-800 dark:text-zinc-100">Playground</h1>
        <PlaygroundDialog />
        <Link
          to="/"
          className="absolute right-4 bottom-4 text-xs tracking-wide text-zinc-500/65 underline decoration-zinc-500/30 underline-offset-2 transition-colors hover:text-zinc-700/85 dark:text-zinc-400/55 dark:hover:text-zinc-200/70"
        >
          back to main
        </Link>
        <div className="mt-8 flex flex-col gap-4">
          <ButtonGroup orientation="horizontal" className="gap-5">
            <Button onClick={() => console.log("clicked Short button")} variant="green">
              Short
            </Button>
            <Button
              onClick={() => {
                console.log("clicked Of Considerable Length button");
                handleChangeColor();
              }}
              variant={longColor}
            >
              Of Considerable Length
            </Button>
          </ButtonGroup>
          <ButtonGroup orientation="vertical">
            <Button onClick={() => console.log("clicked Hello button")} size="md" variant="white">
              Hello
            </Button>
            <Button onClick={() => console.log("clicked Hello but Longer button")} size="md" variant="black">
              Hello but Longer
            </Button>
            <Button
              onClick={() => {
                console.log(`clicked ${longColor} button`);
                handleChangeColor();
              }}
              size="md"
              variant={longColor}
            >
              {longColor}
            </Button>
          </ButtonGroup>
        </div>
      </main>
    </div>
  );
}

export default PlaygroundPage;
