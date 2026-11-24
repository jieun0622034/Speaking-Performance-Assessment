import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Node's dotenv parser loads configuration without overwriting exported variables.
const root = fileURLToPath(new URL('..', import.meta.url));
for (const file of ['.env.local', '.env']) {
  const location = fileURLToPath(new URL(`../${file}`, import.meta.url));
  if (existsSync(location)) process.loadEnvFile(location);
}
const windows = process.platform === 'win32';
const command = windows ? 'mvnw.cmd' : './mvnw';
const args = process.argv.slice(2);
if (process.env.MAVEN_REPO_LOCAL) args.unshift(`-Dmaven.repo.local=${process.env.MAVEN_REPO_LOCAL}`);
const child = spawn(command, args, {
  cwd: `${root}/backend`, env: process.env, stdio: 'inherit', shell: windows,
});
child.on('error', error => {
  console.error(`Spring Boot 실행 실패: ${error.message}. Java 17 이상을 확인해주세요.`);
  process.exitCode = 1;
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', (code, signal) => { process.exitCode = signal ? 1 : code ?? 1; });
