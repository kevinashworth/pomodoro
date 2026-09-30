import Button from "@/components/button";
import ButtonGroup from "@/components/button-group";
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
        <h2 id="skip-confirm-title" className="text-base font-medium text-zinc-50">
          Skip current phase?
        </h2>
        <p id="skip-confirm-description" className="text-sm text-zinc-300">
          This will end the current phase immediately and move to the next one.
        </p>
        <div className="mt-2 flex justify-end">
          <ButtonGroup>
            <Button
              className="font-normal"
              data-testid="skip-confirm-cancel"
              onClick={() => onOpenChange(false)}
              size="sm"
              type="button"
              variant="dark"
            >
              Cancel
            </Button>
            <Button
              className="font-normal"
              data-testid="skip-confirm-confirm"
              onClick={onConfirm}
              size="sm"
              type="button"
              variant="light"
            >
              Skip
            </Button>
          </ButtonGroup>
        </div>
      </section>
    </Dialog>
  );
}
