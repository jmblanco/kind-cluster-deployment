#!/usr/bin/env node

import { runInteractiveMenu, runCliCommand } from '../src/menu.js';

const arg = process.argv[2];

if (arg) {
  runCliCommand(arg).catch((err) => {
    console.error('\nOcurrió un error inesperado:', err);
    process.exit(1);
  });
} else {
  runInteractiveMenu().catch((err) => {
    console.error('\nOcurrió un error inesperado:', err);
    process.exit(1);
  });
}
