import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const landingRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = path.resolve(landingRoot, '..');
const backendPublic = path.join(repositoryRoot, 'public');
const outputDirectory = path.join(landingRoot, 'dist');

await mkdir(outputDirectory, { recursive: true });
await cp(backendPublic, outputDirectory, {
  recursive: true,
  filter: (source) => {
    const relative = path.relative(backendPublic, source);
    return relative !== 'uploads' && !relative.startsWith(`uploads${path.sep}`);
  },
});
