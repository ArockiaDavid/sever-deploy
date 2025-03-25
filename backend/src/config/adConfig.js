// Active Directory Configuration for SSO
module.exports = {
  // Domain Controller Configuration
  ad: {
    // Domain Controller IP
    controllerIP: process.env.DC_IP || 'your-dc-ip',

    // Domain Name (e.g., mypiramal.com)
    domain: process.env.DOMAIN || 'your-domain',

    // Optional: Port (default is 389 for LDAP)
    port: process.env.DC_PORT || 389,

    // Get baseDN from domain
    getBaseDN: function() {
      const domain = this.domain;
      const parts = domain.split('.');
      return parts.map(part => `dc=${part}`).join(',');
    }
  },

  // Session Configuration
  session: {
    secret: process.env.SSO_SESSION_SECRET || 'your-session-secret',
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true
    }
  }
};
