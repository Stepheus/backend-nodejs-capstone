/* global process */
const config = {
  backendUrl: window._env_?.REACT_APP_BACKEND_URL || process.env.REACT_APP_BACKEND_URL,
};

console.log(`backendUrl in config.js: ${config.backendUrl}`)
export {config as urlConfig}
