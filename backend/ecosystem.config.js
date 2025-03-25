module.exports = {
  apps: [{
    name: 'software-center-backend',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3007,
      MONGODB_URI: 'your_production_mongodb_uri',
      JWT_SECRET: 'your_production_jwt_secret'
    }
  }]
};
