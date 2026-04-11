import type * as React from "react";

declare namespace JSX {
  interface IntrinsicElements {
    "pose-viewer": React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement>,
      HTMLElement
    > & {
      src?: string;
      renderer?: "canvas" | "svg" | "interactive";
      autoplay?: string | boolean;
      loop?: string | boolean;
      width?: string;
      height?: string;
      padding?: string;
      thickness?: string | number;
      background?: string;
      "aspect-ratio"?: string | number;
    };
  }
}

export {};
