/**
 * VeraProof AI - Configuration Template
 * This file is processed during deployment to inject environment-specific values
 * 
 * During deployment:
 * 1. Replace {{API_URL}} with actual Lightsail API URL
 * 2. Save as config.js
 * 3. Include in index.html before other scripts
 */

window.VERAPROOF_CONFIG = {
  apiUrl: '{{API_URL}}',  // Will be replaced during deployment
  environment: '{{ENVIRONMENT}}',  // dev, staging, prod
  version: '{{VERSION}}'  // Git commit hash or version number
};

// For backward compatibility
window.VERAPROOF_API_URL = window.VERAPROOF_CONFIG.apiUrl;
