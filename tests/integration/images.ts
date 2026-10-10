import { readFileSync } from 'fs';
import { join } from 'path';

/** The pinned image starting with `prefix`, from `.github/docker-images.txt`, the one place it is declared. */
function pinnedImage(prefix: string): string {
  const lines = readFileSync(join(__dirname, '..', '..', '.github', 'docker-images.txt'), 'utf8').split('\n');
  const image = lines.map((line) => line.trim()).find((line) => line.startsWith(prefix));
  if (!image) {
    throw new Error(`no ${prefix} image in .github/docker-images.txt`);
  }
  return image;
}

/** The pinned floci/floci tag every integration test runs against. */
export const TEST_IMAGE = pinnedImage('floci/floci:');
