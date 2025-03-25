const ldap = require('ldapjs');
const config = require('../config/adConfig');

class ADAuthService {
  constructor() {
    this.domain = config.ad.domain;
    this.url = `ldaps://${config.ad.controllerIP}:636`;
    
    console.log('Initializing AD connection with:', {
      url: this.url,
      domain: this.domain
    });
  }

  // Format username with domain
  formatUsername(username) {
    if (!username.includes('@') && !username.includes('\\')) {
      return `${username}@${this.domain}`;
    }
    return username;
  }

  async authenticate(username, password) {
    return new Promise((resolve, reject) => {
      const formattedUsername = this.formatUsername(username);
      console.log('Attempting authentication for:', formattedUsername);

      const client = ldap.createClient({
        url: this.url,
        connectTimeout: 10000,
        timeout: 15000,
        idleTimeout: 20000,
        tlsOptions: {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2'
        },
        reconnect: true
      });

      client.on('connect', () => {
        console.log('Connected to LDAP server');
      });

      client.on('error', (err) => {
        console.error('LDAP client error:', err);
      });

      client.on('connectError', (err) => {
        console.error('LDAP connect error:', err);
      });

      // Bind with user credentials
      client.bind(formattedUsername, password, (err) => {
        if (err) {
          console.error('LDAP bind error:', {
            error: err.message,
            code: err.code,
            name: err.name,
            stack: err.stack
          });
          client.destroy();
          reject(new Error('Authentication failed'));
          return;
        }

        console.log('User authenticated successfully:', username);
        client.unbind();

        // Return basic user info
        resolve({
          username: username,
          email: formattedUsername,
          displayName: username,
          role: 'user'
        });
      });
    });
  }
}

module.exports = new ADAuthService();
