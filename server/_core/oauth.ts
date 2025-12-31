import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      // 1. 换取 Token
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      
      // 【关键修复】Google 返回的是 access_token 而不是 accessToken
      // 使用 (tokenResponse as any).access_token 来兼容 Google 的命名
      const accessToken = (tokenResponse as any).access_token || tokenResponse.accessToken;

      if (!accessToken) {
        console.error("[OAuth] 未能从 Google 获取 access_token. 响应内容:", tokenResponse);
        throw new Error("Access token missing from Google response");
      }

      // 2. 获取用户信息
      const userInfo = await sdk.getUserInfo(accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      // 3. 同步数据库
      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: "google", // 明确标识为 google
        lastSignedIn: new Date(),
      });

      // 4. 创建 Session
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { 
        ...cookieOptions, 
        maxAge: ONE_YEAR_MS,
        httpOnly: true // 增加安全性
      });

      // 5. 成功跳转
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed:", error instanceof Error ? error.message : error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}