// CSS Custom Highlight API — not yet in TypeScript 5.2 DOM lib
// https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API

declare class Highlight {
  constructor(...ranges: Range[]): void;
}

declare namespace CSS {
  const highlights: Map<string, Highlight>;
}
