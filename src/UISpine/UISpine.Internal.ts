import type { MaterialWithMap } from "@esotericsoftware/spine-threejs";
import type { UIDummyOptions, UIMicroConfig } from "laymur";
import type { MaterialParameters, Matrix4 } from "three";
import { MeshBasicMaterial } from "three";

/** Rectangle in skeleton space (Spine units, y up) */
export interface UISpineRect {
  /** X coordinate of the left edge */
  x: number;
  /** Y coordinate of the bottom edge */
  y: number;
  /** Width, must be positive */
  width: number;
  /** Height, must be positive */
  height: number;
}

/** How the reference rectangle is placed into the element box */
export enum UISpineFitMode {
  /**
   * Scales each axis on its own, so the reference rectangle fills the box exactly, the way
   * UIImage stretches its texture. Pair it with UIAspectConstraint to keep the proportions.
   */
  STRETCH = 0,
  /**
   * Scales both axes by the same factor, so the whole reference rectangle fits into the box,
   * centered along the axis with spare room.
   */
  CONTAIN = 1,
}

/** Configuration options for UISpine */
export interface UISpineOptions extends UIDummyOptions {
  /** Transforms that don't affect constraints */
  micro: Partial<UIMicroConfig>;
  /**
   * Skeleton-space rectangle mapped onto the element box. Defaults to the setup pose bounds
   * stored in the skeleton file (`SkeletonData.x/y/width/height`). It is a fixed rectangle on
   * purpose: the animated bounds change every frame, and a layout built on them would shake.
   */
  referenceRect: UISpineRect;
  /** How the reference rectangle is placed into the element box */
  fitMode: UISpineFitMode;
  /**
   * Longest animation step in seconds; longer frames, such as after a hidden tab, are clamped,
   * so the animation does not jump and physics constraints do not take one huge step
   */
  maxDeltaTime: number;
  /** Enables Spine tint black; spine-threejs turns it on when omitted */
  twoColorTint: boolean;
  /**
   * Creates the materials of the skeleton meshes. The parameters it receives already have the
   * depth test and depth write turned off; keep them off, the draw order of the layer and of
   * the skeleton's own slots relies on it. Return a new material on every call: a material
   * shared between skeletons cannot follow the mask of each.
   */
  materialFactory: (parameters: MaterialParameters) => MaterialWithMap;
}

export const SPINE_DEFAULT_FIT_MODE = UISpineFitMode.STRETCH;
export const SPINE_DEFAULT_MAX_DELTA_TIME = 0.1;

/**
 * Material parameters UISpine forces on top of the spine-threejs defaults. Laymur draws without
 * depth testing and orders everything by renderOrder; a skeleton that writes depth would hide
 * parts of other skeletons and particles drawn after it.
 */
export const SPINE_MATERIAL_OVERRIDES: MaterialParameters = {
  depthTest: false,
  depthWrite: false,
};

/**
 * Default material factory, the same material spine-threejs creates on its own.
 * @param parameters Material parameters prepared by spine-threejs and UISpine
 * @returns Material for one skeleton mesh batch
 */
export function createSpineMaterial(parameters: MaterialParameters): MaterialWithMap {
  return new MeshBasicMaterial(parameters);
}

/**
 * Throws if the value is not a positive finite number.
 * @param value Value to check
 * @param subject Name of the checked value for the error message
 */
export function assertValidPositiveNumber(value: number, subject: string): void {
  if (!(value > 0) || !Number.isFinite(value)) {
    throw new Error(`${subject}: must be a positive finite number, got ${value}`);
  }
}

/**
 * Throws if the rectangle cannot be mapped onto an element box.
 * @param rect Rectangle to check
 * @param subject Name of the checked value for the error message
 */
export function assertValidSpineRect(rect: UISpineRect, subject: string): void {
  if (!Number.isFinite(rect.x) || !Number.isFinite(rect.y)) {
    throw new Error(`${subject}: x and y must be finite numbers, got ${rect.x}, ${rect.y}`);
  }
  if (!(rect.width > 0) || !(rect.height > 0) || !Number.isFinite(rect.width + rect.height)) {
    throw new Error(
      `${subject}: width and height must be positive finite numbers, got ${rect.width}, ${rect.height}`,
    );
  }
}

/**
 * Builds the matrix that takes skeleton space to the unit square of the element box
 * (0,0 = bottom-left, 1,1 = top-right). Multiplied after the element transform, which maps the
 * unit square onto the box, it places the reference rectangle into the box.
 * @param target Matrix to write into
 * @param rect Reference rectangle in skeleton space
 * @param fitMode How the rectangle is placed into the box
 * @param width Width of the element box
 * @param height Height of the element box
 * @returns The target matrix
 */
export function composeReferenceMatrix(
  target: Matrix4,
  rect: UISpineRect,
  fitMode: UISpineFitMode,
  width: number,
  height: number,
): Matrix4 {
  let scaleX = 1 / rect.width;
  let scaleY = 1 / rect.height;
  let offsetX = 0;
  let offsetY = 0;

  if (fitMode === UISpineFitMode.CONTAIN) {
    const scale = Math.min(width / rect.width, height / rect.height);
    scaleX = scale / width;
    scaleY = scale / height;
    offsetX = (1 - rect.width * scaleX) / 2;
    offsetY = (1 - rect.height * scaleY) / 2;
  }

  // prettier-ignore
  return target.set(
    scaleX, 0, 0, offsetX - rect.x * scaleX,
    0, scaleY, 0, offsetY - rect.y * scaleY,
    0, 0, 1, 0,
    0, 0, 0, 1,
  );
}
