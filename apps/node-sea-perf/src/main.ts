import { setTimeout } from 'node:timers/promises';

setTimeout(10)
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
