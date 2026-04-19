const devApiUrl = (() => {
  if (typeof window === 'undefined') {
    return 'http://localhost:8100';
  }

  const host = window.location.hostname || 'localhost';
  return `http://${host}:8100`;
})();

export const environment = {
  production: false,
  apiUrl: devApiUrl,
};
