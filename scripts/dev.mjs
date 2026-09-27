import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const python = resolve(root, process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python');
const vite = resolve(root, 'frontend/node_modules/vite/bin/vite.js');
if (!existsSync(python) || !existsSync(vite)) {
  const setupCmd = process.platform === 'win32' ? 'npm.cmd run setup' : 'npm run setup';
  console.error(`Chưa cài môi trường. Chạy ${setupCmd} trước.`);
  process.exit(1);
}
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode === null && child.pid) {
      if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
      else child.kill('SIGTERM');
    }
  }
  process.exitCode = code;
}
function run(command, args, cwd) {
  const child = spawn(command, args, { cwd, stdio: 'inherit', windowsHide: true });
  children.push(child);
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => { if (!stopping) stop(code ?? 1); });
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
console.log('\nFrontend: http://localhost:5173\nFlask:    http://127.0.0.1:3000/api/health\nCtrl+C để dừng cả hai.\n');
run(python, ['-m', 'flask', '--app', 'backend.app', 'run', '--port', '3000', '--debug', '--no-reload'], root);
run(process.execPath, [vite, '--host', '127.0.0.1', '--port', '5173', '--strictPort'], resolve(root, 'frontend'));
