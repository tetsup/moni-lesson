# Room coordinate system and asset guidelines

## Room coordinates

- The logical origin (0, 0, 0) is the back corner of the floor where the X, Y, and Z axes meet.
- +X runs horizontally across the room toward the right side of the room.
- +Y runs from the back of the room toward the viewer/front.
- +Z runs vertically upward from the floor.
- Use a consistent isometric view: the projected X and Y floor axes are diagonal in opposite screen directions, while Z is vertical on screen. Use approximately 30-degree floor-axis diagonals and keep the convention consistent across the room and all assets.
- Logical dimensions are unitless. Do not bake a pixel-per-unit scale into the data model.
- A placement's (x, y, z) is the logical lower/back anchor of the item, not its image's top-left corner.
- FurnitureImage.anchor is a pixel coordinate within the source image, measured from the image's top-left. It identifies the exact pixel that should line up with the placement's logical anchor.

## Furniture dimensions

- solid: size.x, size.y, and size.z describe width across X, depth along Y, and height along Z.
- floor-covering: size.x and size.y describe the floor footprint; size.z is 0.
- wall-mounted: size.x and size.z describe width and height; size.y is 0 because it has no depth/thickness.
- These dimensions are logical design metadata for consistent asset scale and future rendering. Initial placement does not perform overlap or bounds validation.
- Facing is exactly front-left or front-right; do not add arbitrary rotation angles.

## Asset generation requirements

- Create transparent-background PNG assets for individual furniture, with no room, floor, wall, detached cast shadow, labels, or UI.
- Use one consistent camera, projection, lighting, outline/rendering style, and apparent scale across every item.
- Keep the full object inside the canvas and specify its logical size and image-space anchor alongside each asset.
- For paired facing variants, mirror/re-render the same object consistently; do not change its dimensions or design between variants.
- The room skin is a separate background image. Furniture assets must not include the room background.
- Initial renderer uses fixed category layers: wall-mounted, then floor-covering, then solid furniture. Solid items are drawn back-to-front by increasing Y. Do not rely on overlap/collision logic.


## Screen projection helper

The projection helper uses configurable pixel scales rather than embedding a fixed pixels-per-unit ratio in room state:

- `unitWidth`: horizontal pixel separation between the projected +X and +Y directions for one logical unit.
- `unitDepth`: downward pixel component of either floor-axis direction per logical unit.
- `unitHeight`: upward screen pixels per logical Z unit.
- `origin`: screen position corresponding to logical `(0, 0, 0)`.

With these values, `+X` projects right/down, `+Y` projects left/down, and `+Z` projects straight up. Furniture image top-left is computed by subtracting its pixel-space image anchor from the projected placement point.
