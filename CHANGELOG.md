# Changelog

Every notable change to laymur-spine. Versions follow semver; while the major is 0, any release
may break the API. Breaking changes are marked.

## Unreleased

### Changed

- **Breaking:** requires laymur 0.30 (`>=0.30.0 <0.31.0`).

### Added

- `UISpine` takes part in `UILayer.compile`: the skeleton meshes are created from the current
  pose, without advancing the animation, and their programs are built with the layer.

## 0.0.7 - 2026-11-19

### Changed

- **Breaking:** requires laymur 0.29 (`>=0.29.0 <0.30.0`).

### Added

- `zIndex` in `UISpineOptions`, from the laymur 0.29 element options.

## 0.0.6 - 2026-11-19

### Changed

- **Breaking:** requires laymur 0.28 (`>=0.28.0 <0.29.0`).

## 0.0.5 - 2026-11-16

### Changed

- The `three` peer range is `>=0.162.0 <0.185.0`, up from `<0.180.0`. The upper bound is the one
  `@esotericsoftware/spine-threejs` 4.2 declares.

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
