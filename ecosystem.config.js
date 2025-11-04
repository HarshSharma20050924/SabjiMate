// This file is for PM2 configuration
// To use: `npm run start:prod` from the project root.
// This will build both server and client, then start both server and worker with PM2.
// To stop: `npm run stop:prod`

module.exports = {
  apps: [
    {
      name: 'sabzimate-server',
      script: './packages/server/dist/server/src/index.js',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
      },
    }
  ],
};