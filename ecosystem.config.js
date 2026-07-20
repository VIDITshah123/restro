module.exports = {
  apps: [
    {
      name: 'restro-api',
      script: 'index.js', // Or the entry point to your server
      cwd: './server',     // Path to the server directory
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'restro-ai',
      script: 'app.py',
      cwd: './ai-service',
      interpreter: '/home/ubuntu/restro/ai-service/venv/bin/python3',
      env: {
        PORT: 5000
      }
    }
  ]
};
