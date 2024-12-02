import { FastifyInstance } from 'fastify';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import sea from 'node:sea';
import { pipeline } from 'node:stream/promises';
import { getAssetsDir } from '../helpers';

export default async function (fastify: FastifyInstance) {
  const dataDir = await getAssetsDir();

  // Utility to safely resolve paths and prevent directory traversal
  const safePathResolve = (
    userPath: string,
    baseDir: string
  ): string | null => {
    if (!userPath || /[/\\]/.test(userPath)) {
      return null;
    }
    try {
      const resolvedPath = path.resolve(baseDir, userPath);
      // Ensure the resolved path stays within the baseDir
      if (!resolvedPath.startsWith(path.resolve(baseDir))) {
        fastify.log.warn({ path: userPath }, 'Path traversal attempt detected');
        return null;
      }
      return resolvedPath;
    } catch (err) {
      fastify.log.error({ err, path: userPath }, 'Path resolution error');
      return null;
    }
  };

  fastify.get('/', async function () {
    return { message: 'Hello API' };
  });

  // Handle file uploads to external directory
  fastify.post('/upload', async (request, reply) => {
    try {
      const data = await request.file();
      if (!data) {
        reply.status(400).send({ error: 'No file provided' });
        return;
      }

      const filePath = safePathResolve(data.filename, dataDir);
      if (!filePath) {
        reply.status(400).send({ error: 'Invalid file path' });
        return;
      }

      await pipeline(data.file, createWriteStream(filePath));

      // Update manifest
      const manifestPath = path.join(dataDir, 'manifest.json');
      let manifest: { files: Array<{ name: string; timestamp: number }> } = {
        files: [],
      };

      try {
        const manifestContent = await fs.readFile(manifestPath, 'utf-8');
        manifest = JSON.parse(manifestContent);
      } catch (err) {
        // Manifest doesn't exist yet, use default empty manifest
      }

      manifest.files.push({
        name: data.filename,
        timestamp: Date.now(),
      });

      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

      reply.send({
        status: 'success',
        file: {
          name: data.filename,
          size: data.file.bytesRead,
        },
      });
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Upload failed' });
    }
  });
  // List uploaded files
  fastify.get('/files', async (request, reply) => {
    try {
      const dataDir = await getAssetsDir();
      const manifestPath = path.join(dataDir, 'manifest.json');

      try {
        const content = await fs.readFile(manifestPath, 'utf-8');
        reply.send(JSON.parse(content));
      } catch (err) {
        // If manifest doesn't exist, return empty file list
        reply.send({ files: [] });
      }
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to list files' });
    }
  });

  // Get file info
  fastify.get('/files/:filename', async (request, reply) => {
    const { filename } = request.params as { filename: string };

    try {
      const dataDir = await getAssetsDir();
      const filePath = safePathResolve(filename, dataDir);

      if (!filePath) {
        reply.status(400).send({ error: 'Invalid file path' });
        return;
      }

      const stats = await fs.stat(filePath);
      reply.send({
        name: filename,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        reply.status(404).send({ error: 'File not found' });
      } else {
        fastify.log.error(error);
        reply.status(500).send({ error: 'Internal server error' });
      }
    }
  });

  fastify.get('/sea-assets/:filename', async (request, reply) => {
    if (!sea.isSea()) {
      reply.status(500).send({ error: 'Not in SEA environment' });
      return;
    }
    const { filename } = request.params as { filename: string };
    try {
      const assetBuffer = sea.getAsset(filename);
      reply.send(Buffer.from(assetBuffer).toString());
    } catch (error) {
      if (
        (error as NodeJS.ErrnoException).code ===
        'ERR_SINGLE_EXECUTABLE_APPLICATION_ASSET_NOT_FOUND'
      ) {
        reply.status(404).send({ error: 'File not found' });
      } else {
        fastify.log.error(error);
        reply.status(500).send({ error: 'Internal server error' });
      }
    }
  });
}
