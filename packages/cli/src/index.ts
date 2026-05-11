#!/usr/bin/env bun
import kleur from 'kleur';
import { createProgram } from './program.ts';

createProgram()
  .parseAsync()
  .catch((err: Error) => {
    console.error(kleur.red(`✖ ${err.message}`));
    process.exit(1);
  });
