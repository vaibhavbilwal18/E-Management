import dotenv from "dotenv";
import path from "node:path";

// Runs before any test file's imports (Jest `setupFiles`), so process.env is
// already pointed at the test database by the time src/config/env.ts's own
// `import "dotenv/config"` runs — dotenv doesn't override already-set vars,
// so these values win.
dotenv.config({ path: path.resolve(__dirname, "../.env.test"), override: true });
