# Building sprites

Drop pixel-art PNGs here to replace the placeholder lucide icons. The game
renders `/sprites/<building>.png` for each building and automatically falls back
to the lucide icon when a file is missing, so you can add sprites one at a time.

Expected filenames (must match the building keys exactly):

| File               | Building          |
| ------------------ | ----------------- |
| `derrick.png`      | Derrick           |
| `gasWell.png`      | Gas Well          |
| `refinery.png`     | Refinery          |
| `office.png`       | Sales Office      |
| `lab.png`          | Research Lab      |
| `offshoreRig.png`  | Offshore Platform |

Recommendations:

- Square transparent PNGs (e.g. 64×64 or 128×128); they're rendered small and
  scaled with `image-rendering: pixelated` for crisp pixel art.
- Keep a consistent art direction and camera angle across all six.

These can be generated with the PixelLab MCP server (see `.mcp.json`). Once the
server is reachable, ask for a sprite per building and save the results here.
