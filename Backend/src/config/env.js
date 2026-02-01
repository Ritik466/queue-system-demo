// Deprecated: Use process.env directly
// Kept for backward compatibility
// AWS ECS requires environment variables to be provided

export const env = {
  PORT: process.env.PORT || 3000,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: Number(process.env.DB_PORT || 5432),
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_NAME: process.env.DB_NAME || "queue_db",
  DB_SSL: process.env.DB_SSL || "false",
};
