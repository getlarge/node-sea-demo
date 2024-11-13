import path from 'node:path';
import fs from 'node:fs/promises';

export const getAssetsDir = async () => {
  // path relative to the bundled build output
  const assetsDir = path.join(__dirname, 'src', 'assets');
  try {
    await fs.access(assetsDir);
  } catch {
    await fs.mkdir(assetsDir, { recursive: true });
  }
  return assetsDir;
};
