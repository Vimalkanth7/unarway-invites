import fs from "node:fs";
import path from "node:path";

/** Shared with check-templates.mjs's own budget check -- one number, not two to keep in sync. */
export const MAX_TEMPLATE_BYTES = 3 * 1024 * 1024;

/** Total bytes of every file under dir, recursively. 0 if dir doesn't exist. */
export function dirSize(dir) {
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    total += entry.isDirectory() ? dirSize(full) : fs.statSync(full).size;
  }
  return total;
}
