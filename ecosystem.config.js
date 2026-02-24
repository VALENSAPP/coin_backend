const path = require('path');

module.exports = {
  apps: [
    {
      name: 'backend-server',
      cwd: path.join(__dirname),
      script: 'npm',
      args: 'run start',
      interpreter: 'none',
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
