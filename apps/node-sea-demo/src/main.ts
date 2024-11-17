import sea from 'node:sea';

if (sea.isSea()) {
  // workaround for undefined require.cache https://github.com/nodejs/node/issues/49163
  const { createRequire } = require('node:module');
  // eslint-disable-next-line no-global-assign
  require = createRequire(__filename);
}

import Fastify from 'fastify';
import { app } from './app/app';
import { getAssetsDir } from './app/helpers';

const host = process.env.HOST ?? '0.0.0.0';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const server = Fastify({
  logger: true,
  trustProxy: true,
});

(async () => {
  server.register(app);
  try {
    await server.listen({ port, host });
    console.log(`[ ready ] http://${host}:${port}`);
    console.info(`Assets directory: ${await getAssetsDir()}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
})();
