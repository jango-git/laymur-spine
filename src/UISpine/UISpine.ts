import type {
  AnimationState,
  MaterialWithMap,
  Skeleton,
  SkeletonData,
} from "@esotericsoftware/spine-threejs";
import { Physics, SkeletonMesh } from "@esotericsoftware/spine-threejs";
import type { UILayer } from "laymur";
import { isUIModeVisible, UIDummy, UIMaskMaterialPatch, UIMicro } from "laymur";
import type { Material, MaterialParameters, WebGLRenderer } from "three";
import { Group, Matrix4 } from "three";
import type { UISpineFitMode, UISpineOptions, UISpineRect } from "./UISpine.Internal.js";
import {
  assertValidSpineRect,
  composeReferenceMatrix,
  createSpineMaterial,
  SPINE_DEFAULT_FIT_MODE,
  SPINE_MATERIAL_OVERRIDES,
} from "./UISpine.Internal.js";
import { readSkeletonDataRect } from "./UISpine.Measuring.js";

const TEMP_ELEMENT_MATRIX = new Matrix4();
const TEMP_REFERENCE_MATRIX = new Matrix4();

/**
 * Spine skeleton laid out as a rectangle.
 *
 * The skeleton has no edges of its own: its bounds follow the animation. So the element maps a
 * fixed reference rectangle of skeleton space onto its box, and constraints work on the box as
 * on any other element. The size defaults to the reference rectangle, the way UIImage defaults
 * to its texture size; add UIAspectConstraint to keep the proportions.
 *
 * Layout moves only the container, never the skeleton itself, so physics constraints do not
 * react to layout changes.
 *
 * A mask assigned to the element clips the skeleton as well as its input: the skeleton
 * materials are patched with UIMaskMaterialPatch the first time a mask is set.
 */
export class UISpine extends UIDummy {
  /** Transforms that don't affect constraints */
  public readonly micro: UIMicro;

  /** spine-threejs mesh; animate it through {@link state} and {@link skeleton} */
  public readonly skeletonMesh: SkeletonMesh;

  /**
   * Holds the skeleton mesh. The layer orders it among the planes through its renderOrder;
   * three.js passes the renderOrder of a Group, unlike of a plain Object3D, to the meshes inside.
   */
  private readonly container = new Group();
  private readonly referenceRectInternal: UISpineRect;
  private fitModeInternal: UISpineFitMode;

  /** Clips the skeleton materials by the mask */
  private readonly maskPatch = new UIMaskMaterialPatch();
  private maskPatchUsed = false;

  /**
   * Creates a new UISpine instance.
   *
   * @param layer - Layer containing this element
   * @param skeletonData - Skeleton to display; one SkeletonData can back many elements
   * @param options - Configuration options
   * @throws If the reference rectangle has no area
   */
  constructor(layer: UILayer, skeletonData: SkeletonData, options: Partial<UISpineOptions> = {}) {
    const referenceRect = { ...(options.referenceRect ?? readSkeletonDataRect(skeletonData)) };
    assertValidSpineRect(
      referenceRect,
      options.referenceRect === undefined
        ? "UISpine.constructor.skeletonData: setup pose bounds stored in the skeleton file"
        : "UISpine.constructor.options.referenceRect",
    );

    super(layer, {
      ...options,
      width: options.width ?? referenceRect.width,
      height: options.height ?? referenceRect.height,
    });

    this.micro = new UIMicro(options.micro);
    this.referenceRectInternal = referenceRect;
    this.fitModeInternal = options.fitMode ?? SPINE_DEFAULT_FIT_MODE;

    const materialFactory = options.materialFactory ?? createSpineMaterial;
    this.skeletonMesh = new SkeletonMesh({
      skeletonData,
      twoColorTint: options.twoColorTint,
      materialFactory: (parameters: MaterialParameters): MaterialWithMap =>
        materialFactory({ ...parameters, ...SPINE_MATERIAL_OVERRIDES }),
    });
    // Without depth testing z does nothing but break the plane-ordered depth range
    this.skeletonMesh.zOffset = 0;
    this.skeletonMesh.skeleton.updateWorldTransform(Physics.reset);

    this.container.matrixAutoUpdate = false;
    this.container.add(this.skeletonMesh);

    this.layer.sceneWrapper.insertOrderedObject(this.container, this.renderDepth);
    this.layer.signalRendering.on(this.handleWillRender);
  }

  /** Skeleton pose: bones, slots, skin, color */
  public get skeleton(): Skeleton {
    return this.skeletonMesh.skeleton;
  }

  /** Animation playback: tracks, mixing, time scale */
  public get state(): AnimationState {
    return this.skeletonMesh.state;
  }

  /** Skeleton-space rectangle mapped onto the element box */
  public get referenceRect(): Readonly<UISpineRect> {
    return this.referenceRectInternal;
  }

  /** How the reference rectangle is placed into the element box */
  public get fitMode(): UISpineFitMode {
    return this.fitModeInternal;
  }

  /**
   * Skeleton-space rectangle mapped onto the element box. Changing it does not resize the
   * element; set width and height as well if the layout should follow.
   */
  public set referenceRect(value: UISpineRect) {
    this.assertNotDestroyed("UISpine.referenceRect");
    assertValidSpineRect(value, "UISpine.referenceRect");
    this.referenceRectInternal.x = value.x;
    this.referenceRectInternal.y = value.y;
    this.referenceRectInternal.width = value.width;
    this.referenceRectInternal.height = value.height;
  }

  /** How the reference rectangle is placed into the element box */
  public set fitMode(value: UISpineFitMode) {
    this.assertNotDestroyed("UISpine.fitMode");
    this.fitModeInternal = value;
  }

  /** Frees the skeleton meshes and their materials; textures belong to the atlas */
  protected override destroyInternal(): void {
    this.layer.signalRendering.off(this.handleWillRender);
    this.maskPatch.destroy();
    this.layer.sceneWrapper.removeOrderedObject(this.container);
    this.container.remove(this.skeletonMesh);
    this.skeletonMesh.dispose();
    super.destroyInternal();
  }

  /**
   * Advances the animation and places the skeleton into the box. The animation keeps running
   * while the element is hidden, the same as particles of a hidden emitter.
   */
  protected onWillRender(renderer: WebGLRenderer, deltaTime: number): void {
    this.skeletonMesh.update(deltaTime);
    // Batches are created lazily and their bounding spheres are computed once, from whatever pose
    // was there; culling by them would drop parts of a moving skeleton
    for (const batch of this.skeletonMesh.children) {
      batch.frustumCulled = false;
    }

    this.container.visible = isUIModeVisible(this.mode);
    this.layer.sceneWrapper.setOrderedObjectDepth(this.container, this.renderDepth);

    // Recomputed every frame: the skeleton is redrawn every frame anyway, and the dirty flags of
    // micro are internal to laymur
    const width = this.width;
    const height = this.height;
    const elementMatrix = this.computeVisualTransform(true, TEMP_ELEMENT_MATRIX, this.renderDepth);
    const referenceMatrix = composeReferenceMatrix(
      TEMP_REFERENCE_MATRIX,
      this.referenceRectInternal,
      this.fitModeInternal,
      width,
      height,
    );
    this.container.matrix.multiplyMatrices(elementMatrix, referenceMatrix);
    this.container.matrixWorldNeedsUpdate = true;

    this.updateMask();
  }

  /** Input and masks follow the micro transform of the skeleton */
  protected override getMicro(): UIMicro {
    return this.micro;
  }

  /**
   * Keeps the skeleton materials clipped by the mask. Materials are created lazily with the
   * batches, and spine-threejs sets their onBeforeCompile after the material factory returns,
   * so they are patched here rather than in the factory.
   */
  private updateMask(): void {
    if (this.mask !== null) {
      this.maskPatchUsed = true;
    }
    if (!this.maskPatchUsed) {
      return;
    }

    for (const batch of this.skeletonMesh.children) {
      const material = (batch as { material?: Material | Material[] }).material;
      if (Array.isArray(material)) {
        for (const item of material) {
          this.maskPatch.apply(item);
        }
      } else if (material !== undefined) {
        this.maskPatch.apply(material);
      }
    }
    this.maskPatch.update(this.mask);
  }

  private readonly handleWillRender = (renderer: WebGLRenderer, deltaTime: number): void => {
    this.onWillRender(renderer, deltaTime);
  };
}
