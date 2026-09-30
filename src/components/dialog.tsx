import { type ReactNode, useEffect, useRef } from "react";
import cn from "@/utils/cn";

const dialogAnimationClasses = "zoom-in animate-in fade-in duration-200 starting:scale-95 starting:opacity-0";
const dialogBackdropClasses =
  "backdrop:animate-in backdrop:fade-in backdrop:bg-black/50 backdrop:backdrop-blur-sm backdrop:duration-300 backdrop:starting:opacity-0";
const dialogLayoutClasses = "m-auto h-fit w-70 max-w-md p-3";
const dialogSurfaceClasses = "rounded-2xl border border-zinc-600 bg-zinc-900/95 shadow-lg";

type DialogProps = {
  id: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dialogRef?: React.RefObject<HTMLDialogElement | null>;
  className?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  children: ReactNode;
};

function Dialog({
  id,
  open,
  onOpenChange,
  dialogRef,
  className,
  ariaLabelledBy,
  ariaDescribedBy,
  children,
}: DialogProps) {
  const internalRef = useRef<HTMLDialogElement | null>(null);
  const resolvedRef = dialogRef ?? internalRef;

  useEffect(() => {
    const dialog = resolvedRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      return;
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, resolvedRef]);

  const closeDialog = () => {
    onOpenChange(false);
  };

  return (
    <dialog
      className={cn(
        dialogAnimationClasses,
        dialogBackdropClasses,
        dialogLayoutClasses,
        dialogSurfaceClasses,
        className,
      )}
      id={id}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      ref={resolvedRef}
      onCancel={closeDialog}
      onClose={closeDialog}
    >
      {children}
    </dialog>
  );
}

export default Dialog;
