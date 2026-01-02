// 配置环境变量，运行时从 process.env 读取，运行在 Node.js 环境

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // Supabase 配置
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? "",

  // Google OAuth 配置
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI ?? "",

  // AI 内置 API 配置
  aiModel: process.env.AI_MODEL ?? "deepseek-ai/DeepSeek-V3",
  siliconflowApiKey: process.env.SILICONFLOW_API_KEY ?? "",
  siliconflowApiBase: process.env.SILICONFLOW_API_BASE ?? "https://api.siliconflow.cn/v1",
};
