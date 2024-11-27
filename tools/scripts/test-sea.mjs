import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const __dirname = path.resolve(path.dirname(new URL(import.meta.url).pathname));

const options = {
  app: {
    type: 'string',
    short: 'a',
    default: 'node-sea-perf',
  },
};

const configurations = [
  { useSnapshot: false, useCodeCache: false },
  // { useSnapshot: true, useCodeCache: false },
  { useSnapshot: false, useCodeCache: true },
  // { useSnapshot: true, useCodeCache: true },
];

const runTest = (config, app) => {
  const appFolder = path.resolve(__dirname, path.join('..', '..', 'apps', app));

  const configName = `sea-${config.useSnapshot ? 'snap' : 'nosnap'}-${
    config.useCodeCache ? 'cache' : 'nocache'
  }`;

  console.log(`Building SEA with configuration: ${configName}`);

  const configJson = JSON.parse(
    fs.readFileSync(path.join(appFolder, 'sea-config.json'), 'utf8')
  );
  configJson.useSnapshot = config.useSnapshot;
  configJson.useCodeCache = config.useCodeCache;
  configJson.output = `dist/apps/${app}/${configName}.blob`;

  fs.writeFileSync(
    path.join(appFolder, 'sea-config.json'),
    JSON.stringify(configJson, null, 2)
  );

  execSync(`npx nx run ${app}:sea-build`);

  const stats = fs.statSync(`${configJson.output}`);
  const runs = 10;
  const times = [];

  for (let i = 0; i < runs; i++) {
    console.log(`Run ${i + 1}/${runs}`);
    const start = process.hrtime.bigint();
    execSync(`./dist/apps/${app}/node`);

    const end = process.hrtime.bigint();
    times.push(Number(end - start) / 1_000_000); // Convert to milliseconds
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);

  return {
    config: configName,
    blobSize: stats.size,
    avgStartupTime: avg,
    minStartupTime: min,
    maxStartupTime: max,
  };
};

const main = () => {
  const { values } = parseArgs({ options });
  const results = [];
  for (const config of configurations) {
    const result = runTest(config, values.app);
    results.push(result);
  }

  console.table(results);
};

main();
