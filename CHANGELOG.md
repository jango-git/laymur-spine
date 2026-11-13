# Changelog

Every notable change to laymur-spine. Versions follow semver; while the major is 0, any release
may break the API. Breaking changes are marked.

## 0.0.4 - 2026-11-13

### Changed

- **Breaking:** requires laymur 0.27 (`>=0.27.0 <0.28.0`).
- A frame step longer than `maxDeltaTime` is clamped. Before, after a hidden tab or a lost WebGL
  context, the skeleton took the whole gap in one step: the animation jumped and physics
  constraints swung out.

### Added

- `UISpineOptions.maxDeltaTime` and `UISpine.maxDeltaTime`, the longest animation step in seconds
  (0.1 by default, like `UIEmitter`).

## 0.0.3 - 2026-11-07

### Changed

- **Breaking:** requires laymur 0.26. The package is compiled with `tsc` instead of being bundled.
- **Breaking:** `UISpine` is a box laid out by constraints. It maps a fixed reference rectangle of
  skeleton space onto the box (`referenceRect`, `fitMode`), by default the setup pose bounds
  stored in the skeleton file.
- Input follows the micro transform, like on other elements.

### Added

- A `UIMask` assigned to the element clips the skeleton as well as its input.
- `measureBoundingBoxAttachment`, `measureAnimation` and `readSkeletonDataRect`, to build a
  reference rectangle.
