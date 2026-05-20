// Remotion CLI / renderer config. Picked up by `selectComposition` and
// `renderMedia` calls in /api/render-brand-asset.

import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// On Windows, chrome download may need a few minutes on first run. Renderer
// auto-downloads to node_modules/@remotion/compositor-*. No manual setup.
