export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// 前段配置文件，运行在浏览器环境
export const getLoginUrl = () => {
  // 1. Google 授权地址
  const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
  // 从环境变量读取你申请到的 Google Client ID
  const clientId = import.meta.env.VITE_APP_ID;

  // 必须和你在 Google 控制台填写的 Redirect URI 保持一致
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  // State 建议传回跳地址，这里用 Base64 编码一下
  const state = btoa(window.location.origin);

  // 构造标准的 Google OAuth2 参数
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    // scope 决定了你能从 Google 拿到哪些数据
    scope: "openid profile email", 
    access_type: "offline",
    prompt: "consent",
    state: state,
  });

  return `${rootUrl}?${params.toString()}`;
};
