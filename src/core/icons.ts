/** Ikon garis sederhana untuk HUD. */
const s = (d: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const icons = {
  back: s('<path d="M15 5l-7 7 7 7"/>'),
  next: s('<path d="M9 5l7 7-7 7"/>'),
  home: s('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/>'),
  soundOn: s('<path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>'),
  soundOff: s('<path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6"/>'),
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>',
  check: s('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  close: s('<path d="M6 6l12 12M18 6L6 18"/>'),
  eye: s('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  eyeOff: s('<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.7 8.4 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 4.4-1"/>'),
  replay: s('<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>'),
};
