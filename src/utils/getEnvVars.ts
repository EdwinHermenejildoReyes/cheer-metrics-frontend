const getEnvVars = () => ({
  mainApiUrl: process.env.NEXT_PUBLIC_MAIN_API_URL,
  webUrl: process.env.NEXT_PUBLIC_WEB_URL,
});

export default getEnvVars;
