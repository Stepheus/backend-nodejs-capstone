
const config = {
  backendUrl: window._env_?.VITE_API_URL || import.meta.env.VITE_API_URL,
};

console.log(`backendUrl in config.js: ${config.backendUrl}`)
export {config as urlConfig}
