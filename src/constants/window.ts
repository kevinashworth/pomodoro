// Ensure these values match the app.windows[0] settings in tauri.conf.json and
// the window constants in src-tauri/src/lib.rs.
// the golden ratio is (1 + Math.sqrt(5)) / 2 (approximately 1.61803), but let's round up to the nearest integer.
// current content size: 280 x 454 (the desktop title bar sits outside this area)

export const WINDOW_WIDTH = 280;
export const WINDOW_HEIGHT = Math.ceil((WINDOW_WIDTH * (1 + Math.sqrt(5))) / 2);
