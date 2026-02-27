type ServerEnv = {
  GOOGLE_PROJECT_ID: string;
  GOOGLE_CLIENT_EMAIL: string;
  GOOGLE_PRIVATE_KEY: string;
  EMAIL_SERVER_HOST?: string;
  EMAIL_SERVER_PORT?: string;
  EMAIL_SERVER_SECURE?: string;
  EMAIL_SERVER_USER?: string;
  EMAIL_SERVER_PASSWORD?: string;
};

function normalizePrivateKey(k: string | undefined) {
  if (!k) return "";
  const hasEscaped = k.includes("\\n");
  return hasEscaped ? k.replace(/\\n/g, "\n") : k;
}

export function getServerEnv(): ServerEnv {
  const pId = process.env.GOOGLE_PROJECT_ID || "";
  const email = process.env.GOOGLE_CLIENT_EMAIL || "";
  const key = normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY) || "";
  return {
    GOOGLE_PROJECT_ID: pId,
    GOOGLE_CLIENT_EMAIL: email,
    GOOGLE_PRIVATE_KEY: key,
    EMAIL_SERVER_HOST: process.env.EMAIL_SERVER_HOST,
    EMAIL_SERVER_PORT: process.env.EMAIL_SERVER_PORT,
    EMAIL_SERVER_SECURE: process.env.EMAIL_SERVER_SECURE,
    EMAIL_SERVER_USER: process.env.EMAIL_SERVER_USER,
    EMAIL_SERVER_PASSWORD: process.env.EMAIL_SERVER_PASSWORD,
  };
}
