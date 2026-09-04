import { useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MENU_COMMAND, type AppMenuCommand } from "@/constants/menu";
import { usePomodoroSettings } from "@/context/pomodoro-settings";
import { useAppMenuEvent } from "@/hooks/use-app-menu-event";

export function useMenuCommands(): void {
  const navigate = useNavigate();
  const location = useLocation();
  const { setMini } = usePomodoroSettings();

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
      if (command === MENU_COMMAND.toggleMini) {
        setMini((mini) => !mini);
      }
    },
    [location.pathname, navigate, setMini],
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
      if (command && event.shiftKey && event.code === "KeyM") {
        event.preventDefault();
        handleMenuCommand(MENU_COMMAND.toggleMini);
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
