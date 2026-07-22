#!/usr/bin/env node
import { createProgram } from './cli/program.js';

const program = createProgram();

program.parseAsync(process.argv).catch((error: unknown) => {
  const options = program.opts<{ debug?: boolean }>();
  if (options.debug === true && error instanceof Error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
  } else {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Erreur : ${message}\n`);
  }
  process.exitCode = 1;
});
