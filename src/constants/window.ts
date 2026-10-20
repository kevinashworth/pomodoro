// ensure these values match with the app.windows[0] settings in tauri.conf.json
// the golden ratio is (1 + Math.sqrt(5)) / 2 (approximately 1.61803), but let's round up to the nearest integer.
// current values: 280 x 454
// TODO: a script to make that happen

export const WINDOW_WIDTH = 280;
export const WINDOW_HEIGHT = Math.ceil((WINDOW_WIDTH * (1 + Math.sqrt(5))) / 2);
