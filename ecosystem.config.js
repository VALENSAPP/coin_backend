const path = require('path');

module.exports = {
  apps: [
    {
      name: 'backend-server',
      cwd: path.join(__dirname),
      script: 'dist/main.js',
      interpreter: 'node',
      interpreter_args: '--max-old-space-size=4096',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
