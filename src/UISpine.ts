import type { SkeletonData } from "@esotericsoftware/spine-threejs";
import { Physics, SkeletonMesh } from "@esotericsoftware/spine-threejs";
import type { UILayer } from "laymur";
import { UIDummy } from "laymur";
import type { WebGLRenderer } from "three";
import type { UISpineOptions } from "./UISpine.Internal";

export class UISpine extends UIDummy {
  public readonly skeletonMesh: SkeletonMesh;

  constructor(layer: UILayer, skeletonData: SkeletonData, options: Partial<UISpineOptions> = {}) {
    super(layer, options);
    this.layer.signalRendering.on(this.onWillRender);

    this.skeletonMesh = new SkeletonMesh({ skeletonData });
    // @ts-expect-error - Internal API for adding custom objects to scene
    this.layer.sceneWrapper.insertCustomObject(this.skeletonMesh);

    this.skeletonMesh.skeleton.setToSetupPose();
    this.skeletonMesh.state.apply(this.skeletonMesh.skeleton);
    this.skeletonMesh.skeleton.updateWorldTransform(Physics.update);

    if (options.mode !== undefined) {
      this.mode = options.mode;
    }
  }

  public override destroy(): void {
    this.layer.signalRendering.off(this.onWillRender);
    // @ts-expect-error - Internal API for removing custom objects from scene
    this.layer.sceneWrapper.removeCustomObject(this.skeletonMesh);

    this.skeletonMesh.dispose();
    super.destroy();
  }

  protected onWillRender = (renderer: WebGLRenderer, deltaTime: number): void => {
    this.skeletonMesh.position.set(this.x, this.y, this.zIndex);
    this.skeletonMesh.update(deltaTime);
  };
}
