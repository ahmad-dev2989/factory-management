import { spawn } from 'node:child_process';
import http from 'node:http';

console.log('Compiling Electron main and preload processes...');
const tsc = spawn('npx', ['tsc', '-p', 'tsconfig.electron.json'], { shell: true, stdio: 'inherit' });

tsc.on('close', (code) => {
  if (code !== 0) {
    console.error('TypeScript compilation failed. Exiting...');
    process.exit(code);
  }

  console.log('Starting Vite development server...');
  const vite = spawn('npx', ['vite'], { shell: true });

  vite.stdout.on('data', (data) => {
    process.stdout.write(data);
  });
  vite.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  console.log('Starting TypeScript watch compiler for Electron...');
  const tscWatch = spawn('npx', ['tsc', '-p', 'tsconfig.electron.json', '--watch'], { shell: true });

  // Function to poll the port
  let isElectronStarted = false;
  const pollInterval = setInterval(() => {
    if (isElectronStarted) return;

    const req = http.request({ host: 'localhost', port: 5173, method: 'GET', timeout: 500 }, (res) => {
      if ((res.statusCode === 200 || res.statusCode === 304) && !isElectronStarted) {
        isElectronStarted = true;
        clearInterval(pollInterval);
        console.log('Vite server is ready! Launching Electron...');

        const electron = spawn('npx', ['electron', '.'], { shell: true, stdio: 'inherit' });

        electron.on('close', () => {
          console.log('Electron window closed. Cleaning up dev servers...');
          vite.kill();
          tscWatch.kill();
          process.exit(0);
        });
      }
    });

    req.on('error', () => {
      // Vite dev server not yet responding, continue polling
    });
    req.end();
  }, 300);
});
