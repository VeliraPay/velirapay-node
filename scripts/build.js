import { execFileSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const tsc = join(dirname(createRequire(import.meta.url).resolve('typescript/package.json')), 'bin', 'tsc');

rmSync('dist', { recursive: true, force: true });

for (const project of ['tsconfig.build.json', 'tsconfig.cjs.json']) {
    execFileSync(process.execPath, [tsc, '--project', project], { stdio: 'inherit' });
}

// The package is "type": "module", so the CommonJS build says what it is.
writeFileSync('dist/cjs/package.json', `${JSON.stringify({ type: 'commonjs' }, null, 4)}\n`);
