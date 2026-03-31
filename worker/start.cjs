// Bootstrap script that registers tsconfig-paths before running the worker
const path = require("path");

// Register tsconfig paths for @/ alias resolution
require("tsconfig-paths").register({
  baseUrl: path.resolve(__dirname, ".."),
  paths: { "@/*": ["src/*"] },
});

// Now require the actual worker entry (tsx handles TS compilation)
require("./src/index.ts");
