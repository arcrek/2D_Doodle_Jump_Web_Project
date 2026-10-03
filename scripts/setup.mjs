import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const isWin = process.platform === 'win32';

const nodeMajor = Number.parseInt(process.versions.node.split('.')[0], 10);
if (nodeMajor !== 24) {
  console.error('Install Node.js 24 LTS, then open a new terminal.');
  process.exit(1);
}

function runStep(step, command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', windowsHide: true, ...options });
  if (result.error) {
    console.error(`${step} failed to start: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`${step} failed. Read the error above before continuing.`);
    process.exit(result.status ?? 1);
  }
}

function findPythonCommand() {
  const candidates = isWin
    ? [
        ['py', ['-3.12']],
        ['py', ['-3']],
        ['python3.12', []],
        ['python3', []],
        ['python', []],
      ]
    : [
        ['python3.12', []],
        ['python3', []],
        ['python', []],
      ];

  for (const [cmd, args] of candidates) {
    try {
      const res = spawnSync(cmd, [...args, '-c', 'import sys; sys.exit(0 if sys.version_info >= (3, 12) else 1)'], {
        stdio: 'ignore',
        windowsHide: true,
      });
      if (!res.error && res.status === 0) {
        return [cmd, args];
      }
    } catch {
      // continue
    }
  }
  return null;
}

const venvPython = resolve(root, isWin ? '.venv/Scripts/python.exe' : '.venv/bin/python');

if (!existsSync(venvPython)) {
  const pythonCmd = findPythonCommand();
  if (!pythonCmd) {
    console.error('Python 3.12+ not found. Please install Python and add it to PATH.');
    process.exit(1);
  }
  const [cmd, args] = pythonCmd;
  runStep('Create Python environment', cmd, [...args, '-m', 'venv', '.venv']);
}

runStep('Install backend dependencies', venvPython, ['-m', 'pip', 'install', '-r', 'backend/requirements.txt']);

const npmCmd = isWin ? 'npm.cmd' : 'npm';
runStep('Install frontend dependencies', npmCmd, ['--prefix', 'frontend', 'ci'], { shell: isWin });

runStep('Initialize database', venvPython, ['-m', 'flask', '--app', 'backend.app', 'init-db']);

const devCmd = isWin ? 'npm.cmd run dev' : 'npm run dev';
console.log(`\x1b[32mSetup complete. Run: ${devCmd}\x1b[0m`);
