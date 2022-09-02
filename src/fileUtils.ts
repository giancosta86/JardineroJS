import { promisify } from "node:util";
import rimrafOriginal from "rimraf";

export { sync as rimrafSync } from "rimraf";

export const rimraf = promisify(rimrafOriginal);

export async function withRemovablePath(
  path: string,
  action: () => Promise<void>
): Promise<void> {
  try {
    await action();
  } finally {
    await rimraf(path);
  }
}
