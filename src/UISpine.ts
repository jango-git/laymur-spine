import type { SkeletonData } from "@esotericsoftware/spine-threejs";
import { Physics, SkeletonMesh } from "@esotericsoftware/spine-threejs";
import type { UILayer, UIMode } from "laymur";
import { UIElement } from "laymur";
import type { WebGLRenderer } from "three";

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

/**
 * UI element for displaying Spine skeletal animations.
 *
 * UISpine is a concrete implementation of UIElement that renders Spine
 * animations. It exposes the underlying Spine API directly for full control
 * over animations, bones, slots, and other Spine features.
 *
 * @see {@link UIElement} - Base class providing UI element functionality
 * @see {@link AnimationState} - Spine animation state for controlling playback
 * @see {@link Skeleton} - Spine skeleton for bone manipulation
 */
export class UISpine extends UIElement {
  /** Internal storage for the Spine SkeletonMesh (Three.js Object3D) */
  private readonly skeletonMeshInternal: SkeletonMesh;

  /**
   * Creates a new UISpine instance.
   *
   * @param layer - The UI layer that contains this spine animation
   * @param skeletonData - The Spine skeleton data loaded from .json/.skel
   * @param options - Configuration options for the spine element
   */
  constructor(
    layer: UILayer,
    skeletonData: SkeletonData,
    options: Partial<UISpineOptions> = {},
  ) {
    const w = options.width ?? 100;
    const h = options.height ?? 100;

    super(layer, options.x ?? 0, options.y ?? 0, w, h, "", {});

    this.skeletonMeshInternal = new SkeletonMesh({ skeletonData });

    this.sceneWrapper.insertCustomObject(this.skeletonMeshInternal);

    this.skeletonMeshInternal.skeleton.setToSetupPose();
    this.skeletonMeshInternal.state.apply(this.skeletonMeshInternal.skeleton);
    this.skeletonMeshInternal.skeleton.updateWorldTransform(Physics.update);

    if (options.mode !== undefined) {
      this.mode = options.mode;
    }
  }

  /**
   * Gets the Spine SkeletonMesh (Three.js Object3D).
   * @returns The SkeletonMesh instance
   */
  public get skeletonMesh(): SkeletonMesh {
    return this.skeletonMeshInternal;
  }

  /**
   * Destroys the UI spine element by cleaning up color event listeners and all associated resources.
   */
  public override destroy(): void {
    this.sceneWrapper.removeCustomObject(this.skeletonMeshInternal);

    // Dispose Spine resources
    this.skeletonMeshInternal.dispose();

    super.destroy();
  }

  protected override onWillRender(
    renderer: WebGLRenderer,
    deltaTime: number,
  ): void {
    this.skeletonMeshInternal.update(deltaTime);
  }
}
