import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  
  
  try {
    user = await sdk.authenticateRequest(opts.req);
    // console.log("【Context 检查】Cookie 内容:", opts.req.cookies);
    // console.log("【Context 检查】解析出的用户:", user?.username || "未解析到用户");
  } catch (error) {
    // Authentication is optional for public procedures.
    // console.error("【Context 鉴权失败报错】:", error);
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
