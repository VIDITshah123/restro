module.exports = {
  apps: [
    {
      name: 'restro-api',
      script: 'server.js', // Or the entry point to your server
      cwd: './server',     // Path to the server directory
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
