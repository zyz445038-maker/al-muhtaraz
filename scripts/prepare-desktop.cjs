const fs = require('node:fs/promises');
const path = require('node:path');

async function prepareDesktopRuntime() {
  const projectRoot = path.resolve(__dirname, '..');
  const standaloneDirectory = path.join(projectRoot, '.next', 'standalone');
  const serverEntry = path.join(standaloneDirectory, 'server.js');
  const publicDirectory = path.join(projectRoot, 'public');
  const staticDirectory = path.join(projectRoot, '.next', 'static');

  await fs.access(serverEntry);
  await fs.cp(publicDirectory, path.join(standaloneDirectory, 'public'), {
    recursive: true,
    force: true,
  });
  await fs.cp(staticDirectory, path.join(standaloneDirectory, '.next', 'static'), {
    recursive: true,
    force: true,
  });

  console.log('Prepared standalone Next.js runtime for Electron.');
}

prepareDesktopRuntime().catch((error) => {
  console.error('Could not prepare the Electron runtime:', error);
  process.exitCode = 1;
});
