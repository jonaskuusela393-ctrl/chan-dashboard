import { spawn } from "node:child_process";
import process from "node:process";

const isWindows = process.platform === "win32";
const nextBin = isWindows
  ? "node_modules/next/dist/bin/next"
  : "./node_modules/next/dist/bin/next";

const child = spawn(process.execPath, [nextBin, "build"], {
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: process.env.NEXT_TELEMETRY_DISABLED || "1",
  },
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});

child.on("close", (code, signal) => {
  if (signal) {
    console.error(`next build stopped by signal ${signal}`);
    process.exit(1);
  }

  process.exit(code ?? 0);
});
