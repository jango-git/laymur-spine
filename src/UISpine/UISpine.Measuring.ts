import type { SkeletonData, SkinEntry } from "@esotericsoftware/spine-threejs";
import {
  BoundingBoxAttachment,
  MixBlend,
  MixDirection,
  Physics,
  Skeleton,
  SkeletonClipping,
  Vector2,
} from "@esotericsoftware/spine-threejs";

import type { UISpineRect } from "./UISpine.Internal.js";

/** Options for measuring a bounding box attachment */
export interface UISpineBoundingBoxMeasureOptions {
  /**
   * Attachment to measure. When omitted: the slot's setup pose attachment, or, if the slot is
   * empty in the setup pose, the only bounding box the skin has for it
   */
  attachmentName: string;
  /** Skin to look the attachment up in; the default skin when omitted */
  skin: string;
  /**
   * Animation whose pose is measured instead of the setup pose. The setup pose of an asset is not
   * always the pose that plays: spineboy, for one, has the head tilted back in it.
   */
  animationName: string;
  /** Time in seconds within the animation, 0 when omitted */
  time: number;
}

/** Options for measuring an animation */
export interface UISpineAnimationMeasureOptions {
  /** Skin applied while measuring; the default skin when omitted */
  skin: string;
  /** Poses sampled per second of the animation */
  sampleRate: number;
}

export const MEASURE_DEFAULT_SAMPLE_RATE = 30;

/**
 * Setup pose bounds the Spine editor stores in the skeleton file. This is the default
 * reference rectangle of UISpine.
 * @param skeletonData Skeleton to read
 * @returns Rectangle in skeleton space
 */
export function readSkeletonDataRect(skeletonData: SkeletonData): UISpineRect {
  return {
    x: skeletonData.x,
    y: skeletonData.y,
    width: skeletonData.width,
    height: skeletonData.height,
  };
}

/**
 * Measures a bounding box attachment, in the setup pose or in a pose of an animation. This lets
 * the animator draw the layout rectangle in the Spine editor, for example in a slot named
 * "layout".
 * @param skeletonData Skeleton to measure
 * @param slotName Slot holding the bounding box attachment
 * @param options Attachment and skin to use
 * @returns Axis-aligned bounds of the attachment polygon in skeleton space
 * @throws If the slot is missing or holds no bounding box attachment
 */
export function measureBoundingBoxAttachment(
  skeletonData: SkeletonData,
  slotName: string,
  options: Partial<UISpineBoundingBoxMeasureOptions> = {},
): UISpineRect {
  const subject = "measureBoundingBoxAttachment";
  const skeleton = createPosedSkeleton(skeletonData, options.skin);

  const slot = skeleton.findSlot(slotName);
  if (slot === null) {
    throw new Error(`${subject}.slotName: slot "${slotName}" not found`);
  }

  let attachment =
    options.attachmentName === undefined
      ? slot.getAttachment()
      : skeleton.getAttachmentByName(slotName, options.attachmentName);

  if (options.attachmentName === undefined && attachment === null) {
    // Bounding boxes are not drawn, so a layout slot is often left empty in the setup pose
    attachment = findOnlyBoundingBox(skeleton, slot.data.index, slotName, subject);
  }

  if (!(attachment instanceof BoundingBoxAttachment)) {
    throw new Error(
      `${subject}.slotName: slot "${slotName}" has no bounding box attachment` +
        (options.attachmentName === undefined ? "" : ` "${options.attachmentName}"`),
    );
  }

  // computeWorldVertices reads the deform of the slot, which belongs to the attachment the slot
  // holds; with another attachment there, a named or found bounding box would get its deform
  slot.setAttachment(attachment);

  if (options.animationName !== undefined) {
    const animation = skeletonData.findAnimation(options.animationName);
    if (animation === null) {
      throw new Error(
        `${subject}.options.animationName: animation "${options.animationName}" not found`,
      );
    }
    const time = options.time ?? 0;
    animation.apply(skeleton, time, time, false, [], 1, MixBlend.setup, MixDirection.mixIn);
    if (slot.getAttachment() !== attachment) {
      // The animation swapped or hid it at this time; measure it undeformed on the posed bone
      slot.setAttachment(attachment);
    }
  }

  skeleton.updateWorldTransform(Physics.none);
  const vertices = new Array<number>(attachment.worldVerticesLength);
  attachment.computeWorldVertices(slot, 0, attachment.worldVerticesLength, vertices, 0, 2);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < vertices.length; i += 2) {
    minX = Math.min(minX, vertices[i]);
    minY = Math.min(minY, vertices[i + 1]);
    maxX = Math.max(maxX, vertices[i]);
    maxY = Math.max(maxY, vertices[i + 1]);
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Measures the union of the skeleton bounds over an animation, sampled at a fixed rate. It is a
 * one-time measurement meant to give a reference rectangle that holds the whole animation;
 * physics constraints are not simulated, so motion they add is not included.
 * @param skeletonData Skeleton to measure
 * @param animationName Animation to sample
 * @param options Skin and sample rate
 * @returns Rectangle in skeleton space
 * @throws If the animation is missing or no sampled pose has visible attachments
 */
export function measureAnimation(
  skeletonData: SkeletonData,
  animationName: string,
  options: Partial<UISpineAnimationMeasureOptions> = {},
): UISpineRect {
  const subject = "measureAnimation";
  const animation = skeletonData.findAnimation(animationName);
  if (animation === null) {
    throw new Error(`${subject}.animationName: animation "${animationName}" not found`);
  }

  const sampleRate = options.sampleRate ?? MEASURE_DEFAULT_SAMPLE_RATE;
  if (!(sampleRate > 0) || !Number.isFinite(sampleRate)) {
    throw new Error(`${subject}.options.sampleRate: must be a positive number, got ${sampleRate}`);
  }

  const skeleton = createPosedSkeleton(skeletonData, options.skin);
  const clipper = new SkeletonClipping();
  const offset = new Vector2();
  const size = new Vector2();
  const temp: number[] = [];
  const intervals = Math.max(1, Math.ceil(animation.duration * sampleRate));

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i <= intervals; i++) {
    const time = (animation.duration * i) / intervals;
    skeleton.setToSetupPose();
    animation.apply(skeleton, time, time, false, [], 1, MixBlend.setup, MixDirection.mixIn);
    skeleton.updateWorldTransform(Physics.none);
    skeleton.getBounds(offset, size, temp, clipper);

    if (Number.isFinite(size.x) && Number.isFinite(size.y)) {
      minX = Math.min(minX, offset.x);
      minY = Math.min(minY, offset.y);
      maxX = Math.max(maxX, offset.x + size.x);
      maxY = Math.max(maxY, offset.y + size.y);
    }
  }

  if (minX > maxX || minY > maxY) {
    throw new Error(`${subject}.animationName: animation "${animationName}" shows nothing`);
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Finds the bounding box attachment of a slot when the skin holds exactly one.
 * @returns The attachment, or null when the skin has none for the slot
 * @throws If the skin holds several, since picking one would be a guess
 */
function findOnlyBoundingBox(
  skeleton: Skeleton,
  slotIndex: number,
  slotName: string,
  subject: string,
): BoundingBoxAttachment | null {
  const entries: SkinEntry[] = [];
  for (const skin of [skeleton.skin, skeleton.data.defaultSkin]) {
    skin?.getAttachmentsForSlot(slotIndex, entries);
  }

  const names = new Set<string>();
  let found: BoundingBoxAttachment | null = null;
  for (const entry of entries) {
    if (entry.attachment instanceof BoundingBoxAttachment && !names.has(entry.name)) {
      names.add(entry.name);
      found = entry.attachment;
    }
  }

  if (names.size > 1) {
    throw new Error(
      `${subject}.options.attachmentName: slot "${slotName}" has several bounding boxes ` +
        `(${[...names].join(", ")}), pick one`,
    );
  }
  return found;
}

function createPosedSkeleton(skeletonData: SkeletonData, skin: string | undefined): Skeleton {
  const skeleton = new Skeleton(skeletonData);
  if (skin !== undefined) {
    skeleton.setSkinByName(skin);
  }
  skeleton.setToSetupPose();
  return skeleton;
}
