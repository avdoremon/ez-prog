export const LANGS = ['c', 'cpp', 'java', 'py', 'js'] as const;
export type Lang = (typeof LANGS)[number];
