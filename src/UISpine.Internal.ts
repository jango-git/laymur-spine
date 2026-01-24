import type { UIMode } from "laymur";

/**
 * Configuration options for creating a UISpine element.
 */
export interface UISpineOptions {
  /** X position of the element */
  x: number;
  /** Y position of the element */
  y: number;
  /** Width of the element */
  width: number;
  /** Height of the element */
  height: number;
  /** Default UIMode */
  mode: UIMode;
}
