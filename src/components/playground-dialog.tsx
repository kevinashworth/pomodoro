import { useRef, useState } from "react";
import Button from "@/components/button";
import ButtonGroup from "@/components/button-group";
import Dialog from "@/components/dialog";

function PlaygroundDialog() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  return (
    <>
      <button
        type="button"
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        onClick={() => setDialogOpen(true)}
        aria-controls="playground-dialog"
        aria-haspopup="dialog"
      >
        Open Modal
      </button>
      <Dialog
        id="playground-dialog"
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        dialogRef={dialogRef}
        ariaLabelledBy="playground-dialog-title"
        ariaDescribedBy="playground-dialog-desc"
      >
        <div className="flex flex-col overflow-hidden">
          <header className="flex justify-center py-4">
            <h2 id="playground-dialog-title" className="text-lg font-semibold text-zinc-50">
              Confirm Action
            </h2>
          </header>
          <div className="border-b border-zinc-600" />
          <main className="px-4 py-4 sm:px-6">
            <p id="playground-dialog-desc" className="leading-relaxed text-zinc-100">
              Are you sure you want to delete this item? This action cannot be undone and will permanently remove the
              data from our servers.
            </p>
          </main>
          <div className="border-b border-zinc-600" />
          <footer className="flex justify-center py-4">
            <ButtonGroup className="gap-4">
              <Button onClick={() => setDialogOpen(false)} size="sm" type="button" variant="white">
                Cancel
              </Button>
              <Button
                aria-label="Delete item"
                onClick={() => setDialogOpen(false)}
                size="sm"
                type="button"
                variant="red"
              >
                Delete
              </Button>
            </ButtonGroup>
          </footer>
        </div>
      </Dialog>
    </>
  );
}

export default PlaygroundDialog;
