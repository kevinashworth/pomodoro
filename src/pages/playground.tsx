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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-800 px-4 py-8">
      <main className="w-full max-w-md rounded-2xl border border-zinc-300 bg-zinc-900 p-4">
        <Link
          to="/"
          className="absolute right-4 bottom-4 text-xs underline decoration-zinc-500/30 underline-offset-2 transition-colors hover:text-zinc-200/70"
        >
          back to main
        </Link>
        <h1>Playground</h1>
        <h2 className="mt-2">Modal</h2>
        <PlaygroundDialog />
        <h2 className="mt-4">Buttons</h2>
        <p>To cycle through colors, click button with color name</p>
        <div className="flex flex-col gap-4">
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
          <ButtonGroup orientation="horizontal">
            <Button onClick={() => console.log("clicked Light button")} size="sm" variant="light">
              Light
            </Button>
            <Button
              onClick={() => {
                console.log("clicked Dark button");
              }}
              size="sm"
              variant="dark"
            >
              Dark
            </Button>
          </ButtonGroup>
        </div>
      </main>
    </div>
  );
}

export default PlaygroundPage;
