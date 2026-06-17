const DEV_PORTS = new Set(['3000', '3001']);

const getEnvVars = () => {
  let mainApiUrl = process.env.NEXT_PUBLIC_MAIN_API_URL ?? '/api/v1/';

  if (typeof window !== 'undefined' && DEV_PORTS.has(window.location.port)) {
    // npm run dev: Next.js is on port 3000/3001, Django/Nginx is on 8006.
    // Use the same hostname so it works from any device on the network.
    mainApiUrl = `http://${window.location.hostname}:8006/api/v1/`;
  }

  return {
    mainApiUrl,
    webUrl: process.env.NEXT_PUBLIC_WEB_URL,
  };
};

export default getEnvVars;
