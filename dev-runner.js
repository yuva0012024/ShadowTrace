const { spawn } = require('child_process');
const path = require('path');

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

console.log('====================================================');
console.log(' SHADOWTRACE - Starting Full-Stack Development Grid');
console.log(' [ShadowTrace] Launching Backend (5000) & Frontend');
console.log('====================================================');

const backend = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  shell: true
});

const frontend = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(__dirname, 'frontend'),
  stdio: 'inherit',
  shell: true
});

const cleanExit = () => {
  console.log('\n[ShadowTrace] Terminating development services...');
  try {
    if (backend && !backend.killed) {
      if (isWin && backend.pid) {
        spawn('taskkill', ['/pid', backend.pid.toString(), '/f', '/t']);
      } else {
        backend.kill('SIGTERM');
      }
    }
  } catch {}
  try {
    if (frontend && !frontend.killed) {
      if (isWin && frontend.pid) {
        spawn('taskkill', ['/pid', frontend.pid.toString(), '/f', '/t']);
      } else {
        frontend.kill('SIGTERM');
      }
    }
  } catch {}
  process.exit(0);
};

process.on('SIGINT', cleanExit);
process.on('SIGTERM', cleanExit);
