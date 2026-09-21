import { useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MENU_COMMAND, type AppMenuCommand } from "@/constants/menu";
import { useAppMenuEvent } from "@/hooks/use-app-menu-event";

export function useMenuCommands(): void {
  const navigate = useNavigate();
  const location = useLocation();

  const handleMenuCommand = useCallback(
    (command: AppMenuCommand) => {
      if (command === MENU_COMMAND.settings) {
        navigate("/settings");
        return;
      }
      if (command === MENU_COMMAND.home) {
        if (location.pathname !== "/") navigate("/");
        return;
      }
    },
    [location.pathname, navigate],
  );

  useAppMenuEvent(handleMenuCommand);

  // Menu commands work on desktop (native menu) and in the browser (these keys).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const command = event.metaKey || event.ctrlKey;
      if (command && event.key === ",") {
        event.preventDefault();
        handleMenuCommand(MENU_COMMAND.settings);
        return;
      }
      if (event.key === "Escape" || (command && event.key === "1")) {
        if (location.pathname !== "/") {
          event.preventDefault();
          handleMenuCommand(MENU_COMMAND.home);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [handleMenuCommand, location.pathname]);
}
