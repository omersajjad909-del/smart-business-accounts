const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const LOCK_FILE_PATH = path.join(PROJECT_ROOT, ".next", "lock");
const DIAGNOSTICS_DIR_PATH = path.join(PROJECT_ROOT, ".next", "diagnostics");

function forceUnlink(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      console.log(`[next-lock-recover] Found existing lockfile, attempting to remove: ${filePath}`);
      fs.unlinkSync(filePath);
      console.log(`[next-lock-recover] Successfully removed lockfile.`);
    }
  } catch (err) {
    console.error(`[next-lock-recover] Error removing lockfile: ${err.message}`);
    // If unlink fails, it might be a directory. Try removing it recursively.
    try {
      fs.rmSync(filePath, { recursive: true, force: true });
      console.log(`[next-lock-recover] Successfully removed lock directory.`);
    } catch (rmErr) {
      console.error(`[next-lock-recover] Error removing lock directory: ${rmErr.message}`);
    }
  }
}

function forceRemoveDir(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`[next-lock-recover] Removed directory: ${dirPath}`);
      return;
    } catch (err) {
      console.error(`[next-lock-recover] Error removing directory (attempt ${attempt}): ${err.message}`);
      const start = Date.now();
      while (Date.now() - start < 250) {}
    }
  }
}

console.log("[next-lock-recover] Running pre-build lock recovery...");
forceUnlink(LOCK_FILE_PATH);
forceRemoveDir(DIAGNOSTICS_DIR_PATH);
