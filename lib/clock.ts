// The current time, in one place so server pages can ask for it without calling Date.now() during render.
export const nowMs = (): number => Date.now();
