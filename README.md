# laymur-spine

Spine animation support for [Laymur](https://github.com/jango-git/laymur) UI library.

## Installation

```bash
npm install laymur laymur-spine @esotericsoftware/spine-threejs
```

## Usage

`UISpine` is a rectangle like any other Laymur element. It maps a fixed reference rectangle of
skeleton space onto its box: by default the setup pose bounds stored in the skeleton file.

```typescript
import { UIAspectConstraint, UIHorizontalDistanceConstraint, UIVerticalProportionConstraint } from "laymur";
import { UISpine, UISpineFitMode, measureBoundingBoxAttachment } from "laymur-spine";

const hero = new UISpine(layer, skeletonData, {
  // Optional: a bounding box attachment drawn by the animator instead of the setup pose bounds
  referenceRect: measureBoundingBoxAttachment(skeletonData, "layout"),
  fitMode: UISpineFitMode.STRETCH,
});

new UIAspectConstraint(hero);
new UIVerticalProportionConstraint(layer, hero, { proportion: 0.5 });
new UIHorizontalDistanceConstraint(layer, hero, { anchorA: 0.5, anchorB: 0.5 });

hero.state.setAnimation(0, "idle", true);
hero.micro.scaleX = 1.1; // visual-only, like on other elements
```

## License

MIT

**Important:** Spine Runtime is NOT included in this package. This package does not bundle or distribute the Spine runtime library. The Spine runtime (`@esotericsoftware/spine-threejs`) is a peer dependency that must be installed separately.

The Spine runtime is a commercial product developed by Esoteric Software and is subject to its own licensing terms. Please review the [Spine Runtime License](https://github.com/EsotericSoftware/spine-runtimes/blob/4.2/LICENSE) before using in your project.
