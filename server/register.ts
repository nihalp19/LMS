import { register } from 'ts-node';
import { pathToFileURL } from 'node:url';

// Register ts-node as an ESM loader
register({
  transpileOnly: true, // Only transpile, do not type check (optional)
  compilerOptions: {
    module: 'ESNext',       // Use ES modules
    target: 'ESNext',       // Use the latest ECMAScript version
    moduleResolution: 'node',
    esModuleInterop: true,  // For compatibility with CommonJS
    strict: true,           // Enable strict type-checking
  },
});
