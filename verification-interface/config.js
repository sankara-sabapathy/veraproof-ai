/**
 * VeraProof AI - Local Development Configuration
 * This file is used for local development
 * In production, this file is generated from config.template.js during deployment
 */

window.VERAPROOF_CONFIG = {
  apiUrl: '',  // Leave empty to enable dynamic host resolution for local dev
  environment: 'development',
  version: 'local-dev'
};

// For backward compatibility
window.VERAPROOF_API_URL = window.VERAPROOF_CONFIG.apiUrl;
