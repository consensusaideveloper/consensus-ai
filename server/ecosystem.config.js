module.exports = {
  apps: [
    {
      name: 'consensus-ai-server',
      script: 'npx ts-node src/index.ts',
      interpreter: 'bash',
      env: {
        NODE_ENV: 'development',
        DATABASE_URL: 'file:./prisma/dev.db',
      },
      watch: true,
      ignore_watch: ['node_modules', 'dist', 'logs', 'prisma/dev.db'],
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      restart_delay: 1000,
    },
  ],
};