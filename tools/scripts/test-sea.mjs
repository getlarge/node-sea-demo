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

/**
 * "useCodeCache" is redundant when "useSnapshot" is true
 */
const configurations = [
  undefined,
  { useSnapshot: false, useCodeCache: false },
  // { useSnapshot: true, useCodeCache: false },
  { useSnapshot: false, useCodeCache: true },
];

const getAppFolder = (app) =>
  path.resolve(__dirname, path.join('..', '..', 'apps', app));

const getSeaConfig = (app) => {
  const appFolder = getAppFolder(app);
  return JSON.parse(
    fs.readFileSync(path.join(appFolder, 'sea-config.json'), 'utf8')
  );
};

const updateSeaConfig = (app, config) => {
  const appFolder = getAppFolder(app);
  fs.writeFileSync(
    path.join(appFolder, 'sea-config.json'),
    JSON.stringify(config, null, 2)
  );
};

const runSeaTest = (app, config) => {
  const configName = `sea-${config.useSnapshot ? 'snap' : 'nosnap'}-${
    config.useCodeCache ? 'cache' : 'nocache'
  }`;

  console.log(`Building SEA with configuration: ${configName}`);
  const configJson = getSeaConfig(app);
  configJson.useSnapshot = config.useSnapshot;
  configJson.useCodeCache = config.useCodeCache;
  configJson.output = `dist/apps/${app}/${configName}.blob`;
  updateSeaConfig(app, configJson);

  execSync(`npx nx run ${app}:sea-build`);

  const stats = fs.statSync(`${configJson.output}`);
  const runs = 10;
  const times = [];

  for (let i = 0; i < runs; i++) {
    console.log(`Run ${i + 1}/${runs}`);
    const start = process.hrtime.bigint();
    execSync(`./dist/apps/${app}/node`, {
      env: {
        ...process.env,
        BENCHMARK: true,
      },
    });

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

const runRegularAppTest = (app) => {
  execSync(`npx nx run ${app}:build`);

  const runs = 10;
  const times = [];

  for (let i = 0; i < runs; i++) {
    console.log(`Run ${i + 1}/${runs}`);
    const start = process.hrtime.bigint();
    execSync(`node ./dist/apps/${app}/main.js`, {
      env: {
        ...process.env,
        BENCHMARK: true,
      },
    });

    const end = process.hrtime.bigint();
    times.push(Number(end - start) / 1_000_000); // Convert to milliseconds
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);

  return {
    config: undefined,
    blobSize: 0,
    avgStartupTime: avg,
    minStartupTime: min,
    maxStartupTime: max,
  };
};

const runTest = (app, config) => {
  if (!config) {
    return runRegularAppTest(app);
  }
  return runSeaTest(app, config);
};

const main = () => {
  const { values } = parseArgs({ options });
  const { app } = values;
  const results = [];
  for (const config of configurations) {
    const result = runTest(app, config);
    results.push(result);
  }

  console.table(results);

  const configJson = getSeaConfig(app);
  configJson.useSnapshot = false;
  configJson.useCodeCache = true;
  configJson.output = `dist/apps/${app}/${app}.blob`;
  updateSeaConfig(app, configJson);
};

main();
