import Dialog from "@/components/dialog";

type PomodoroSkipConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function PomodoroSkipConfirmDialog({ open, onOpenChange, onConfirm }: PomodoroSkipConfirmDialogProps) {
  return (
    <Dialog
      id="skip-confirm-dialog"
      open={open}
      onOpenChange={onOpenChange}
      ariaLabelledBy="skip-confirm-title"
      ariaDescribedBy="skip-confirm-description"
    >
      <section data-testid="skip-confirm-dialog" className="flex flex-col gap-3 text-sm text-zinc-200">
        <h2 id="skip-confirm-title" className="text-base font-medium text-zinc-100">
          Skip current phase?
        </h2>
        <p id="skip-confirm-description" className="text-sm text-zinc-300">
          This will end the current phase immediately and move to the next one.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            data-testid="skip-confirm-cancel"
            onClick={() => onOpenChange(false)}
            className="rounded-full border border-zinc-600 px-3 py-1.5 hover:border-zinc-300"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="skip-confirm-confirm"
            onClick={onConfirm}
            className="rounded-full bg-zinc-100 px-3 py-1.5 text-zinc-900"
          >
            Skip
          </button>
        </div>
      </section>
    </Dialog>
  );
}
