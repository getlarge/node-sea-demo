import { FastifyInstance } from 'fastify';
import fastifyMultipart from '@fastify/multipart';
import sensible from '@fastify/sensible';
import fastifyStatic from '@fastify/static';
import { getAssetsDir } from './helpers';
import routes from './routes/root';

export interface AppOptions {
  fileSize?: number;
}

export async function app(fastify: FastifyInstance, opts: AppOptions) {
  await fastify.register(sensible);
  await fastify.register(fastifyMultipart, {
    limits: {
      fileSize: opts.fileSize ?? 1048576 * 10, // 10MB
    },
  });
  const assetsDir = await getAssetsDir();
  await fastify.register(fastifyStatic, {
    root: assetsDir,
    prefix: '/assets/', // optional: default '/'
  });
  await fastify.register(routes);
}
