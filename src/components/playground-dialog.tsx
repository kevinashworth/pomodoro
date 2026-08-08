"use client";

import { useRef, useState } from "react";
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
          <header className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-6">
            <h2
              id="playground-dialog-title"
              className="text-lg font-semibold text-slate-900"
            >
              Confirm Action
            </h2>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
              onClick={() => setDialogOpen(false)}
              aria-label="Close modal"
            >
              <span className="text-xl leading-none" aria-hidden="true">
                ×
              </span>
              <span className="sr-only">Close modal</span>
            </button>
          </header>
          <main className="px-4 py-4 sm:px-6">
            <p
              id="playground-dialog-desc"
              className="leading-relaxed text-slate-700"
            >
              Are you sure you want to delete this item? This action cannot be
              undone and will permanently remove the data from our servers.
            </p>
          </main>
          <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
              type="button"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </button>
            <button
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
              type="button"
              onClick={() => setDialogOpen(false)}
              aria-label="Delete item"
            >
              Delete
            </button>
          </footer>
        </div>
      </Dialog>
    </>
  );
}

export default PlaygroundDialog;