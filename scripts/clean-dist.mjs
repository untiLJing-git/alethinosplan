import { lstatSync, realpathSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = realpathSync(fileURLToPath(new URL('../', import.meta.url)));
const output = resolve(root, 'dist');
const info = lstatSync(output, { throwIfNoEntry: false });
if (info) {
  // Never follow a replaced output directory into a location outside this project.
  if (info.isSymbolicLink() || !info.isDirectory() || relative(root, realpathSync(output)) !== 'dist') {
    throw new Error('Refusing to clean an unexpected dist directory.');
  }
  await rm(output, { recursive: true, force: true });
  if (lstatSync(output, { throwIfNoEntry: false })) throw new Error('Could not clear old build output.');
}
