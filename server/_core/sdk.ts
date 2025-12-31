import { AXIOS_TIMEOUT_MS, COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import axios, { type AxiosInstance } from "axios";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

// 辅助函数
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  openId?: string;
  id?: number;
  appId: string;
  name: string | null;
};

/**
 * OAuthService: 专门负责与 Google 服务器打交道
 */
class OAuthService {
  constructor(private client: AxiosInstance) {
    console.log("[OAuth] SDK Initialized for Google Identity");
  }

  private decodeState(state: string): string {
    try {
      return atob(state);
    } catch {
      return state;
    }
  }

  /**
   * 1. 拿着 Authorization Code 去 Google 换取 Access Token
   */
  async getTokenByCode(code: string, state: string): Promise<any> {
    const tokenUrl = "https://oauth2.googleapis.com/token";
    const payload = {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri:
        process.env.GOOGLE_REDIRECT_URI ||
        "http://localhost:3000/api/oauth/callback",
      grant_type: "authorization_code",
      code,
    };

    const { data } = await axios.post(tokenUrl, payload);
    return data; // 包含 access_token
  }

  /**
   * 2. 拿着 Access Token 去 Google 换取用户信息
   */
  async getUserInfoByToken(accessToken: string): Promise<any> {
    const userInfoUrl = "https://www.googleapis.com/oauth2/v3/userinfo";
    const { data } = await axios.get(userInfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return {
      openId: data.sub, // Google 的唯一标识符是 sub
      name: data.name,
      email: data.email,
      picture: data.picture,
      loginMethod: "google",
    };
  }
}

/**
 * SDKServer: 系统的鉴权中心
 */
class SDKServer {
  private readonly oauthService: OAuthService;

  constructor() {
    const client = axios.create({ timeout: AXIOS_TIMEOUT_MS });
    this.oauthService = new OAuthService(client);
  }

  async exchangeCodeForToken(code: string, state: string): Promise<any> {
    return this.oauthService.getTokenByCode(code, state);
  }

  async getUserInfo(accessToken: string): Promise<any> {
    return this.oauthService.getUserInfoByToken(accessToken);
  }

  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) return new Map<string, string>();
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  private getSessionSecret() {
    return new TextEncoder().encode(ENV.cookieSecret);
  }

  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string; id?: number } = {}
  ): Promise<string> {
    return this.signSession(
      {
        openId,
        id: options.id,
        appId: process.env.VITE_APP_ID || "teaching-platform",
        name: options.name || "",
      },
      options
    );
  }

  // 生成本地 JWT 凭证
  async signSession(
    payload: SessionPayload,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getSessionSecret();

    const jwtPayload: Record<string, any> = {
      appId: payload.appId,
      name: payload.name,
    };

    if (payload.openId) jwtPayload.openId = payload.openId;
    if (payload.id) jwtPayload.id = payload.id;

    return new SignJWT(jwtPayload)
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  // 验证 JWT 凭证
  async verifySession(cookieValue: string | undefined | null) {
    if (!cookieValue) return null;

    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });
      return payload as any;
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }

  /**
   * 核心鉴权逻辑：每次请求都会经过这里
   */
  async authenticateRequest(req: Request): Promise<User> {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);

    if (!session) throw ForbiddenError("Invalid session cookie");

    const signedInAt = new Date();
    let user: User | undefined;

    // 1. 查找用户：优先 ID，其次 OpenID
    if (session.id) {
      user = await db.getUserById(session.id);
    } else if (session.openId) {
      user = await db.getUserByOpenId(session.openId);
    }

    // 2. 找到了就同步登录时间
    if (user) {
      await db.upsertUser({
        id: user.id,
        openId: user.openId || undefined,
        lastSignedIn: signedInAt,
      });
      return user;
    }

    // 3. 如果没找到，报错（Google 登录的回调逻辑应该在外部 API 中处理并完成首次注册）
    throw ForbiddenError("User not found in database");
  }
}

export const sdk = new SDKServer();
