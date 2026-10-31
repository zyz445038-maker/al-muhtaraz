const { spawnSync } = require('node:child_process');
const path = require('node:path');

function runNodeScript(scriptPath, args, env) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    env,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

runNodeScript(
  require.resolve('next/dist/bin/next'),
  ['build'],
  {
    ...process.env,
    NEXT_OUTPUT_STANDALONE: '1',
    NEXT_TELEMETRY_DISABLED: '1',
  },
);
runNodeScript(path.join(__dirname, 'prepare-desktop.cjs'), [], process.env);
