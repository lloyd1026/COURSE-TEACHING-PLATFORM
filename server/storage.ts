import { createClient } from '@supabase/supabase-js';
import { ENV } from './_core/env';

let supabase: ReturnType<typeof createClient> | null = null;
try {
  if (ENV.supabaseUrl && ENV.supabaseServiceRoleKey) {
    supabase = createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey);
  } else {
    console.warn("[Storage] Supabase keys missing, storage disabled.");
  }
} catch (e) {
  console.warn("[Storage] Failed to initialize Supabase client:", e);
}

const bucketName = ENV.supabaseStorageBucket || "avatars";

/**
 * 将文件上传到 Supabase Storage
 * @param relKey 文件路径 (例如: 'avatars/user-1.jpg')
 * @param data 二进制数据 (Buffer)
 * @param contentType 文件类型
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "image/jpeg"
): Promise<{ key: string; url: string }> {
  if (!supabase) throw new Error("Supabase client not initialized (missing credentials)");

  // 1. 上传文件
  const { data: uploadData, error } = await supabase.storage
    .from(bucketName)
    .upload(relKey, data, {
      contentType: contentType,
      upsert: true // 如果文件已存在则覆盖
    });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  // 2. 获取公共访问 URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucketName)
    .getPublicUrl(relKey);

  return {
    key: relKey,
    url: publicUrl
  };
}

/**
 * 获取文件 URL (用于兼容旧接口)
 */
export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  if (!supabase) throw new Error("Supabase client not initialized");
  const { data: { publicUrl } } = supabase.storage
    .from(bucketName)
    .getPublicUrl(relKey);

  return { key: relKey, url: publicUrl };
}

/**
 * 从 Supabase Storage 删除文件
 * @param relKey 文件路径 (例如: 'avatars/user-1-123456.jpg')
 */
export async function storageDelete(relKey: string): Promise<void> {
  if (!supabase) return; // Silent fail or throw? Log warning.
  // 提取 key，去掉可能的完整 URL 前缀，只保留 bucket 后的路径
  // 如果存储的是完整 URL，需要解析出 path 部分
  let path = relKey;
  if (relKey.includes('/public/')) {
    path = relKey.split('/public/')[1].split('/').slice(1).join('/');
  }

  const { error } = await supabase.storage
    .from(bucketName)
    .remove([path]);

  if (error) {
    console.error(`Supabase delete failed: ${error.message}`);
  } else {
    console.log(`✅ 旧文件已从云端清除: ${path}`);
  }
}

// type StorageConfig = { baseUrl: string; apiKey: string };

// function getStorageConfig(): StorageConfig {
//   const baseUrl = ENV.forgeApiUrl;
//   const apiKey = ENV.forgeApiKey;

//   if (!baseUrl || !apiKey) {
//     throw new Error(
//       "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
//     );
//   }

//   return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
// }

// function buildUploadUrl(baseUrl: string, relKey: string): URL {
//   const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
//   url.searchParams.set("path", normalizeKey(relKey));
//   return url;
// }

// async function buildDownloadUrl(
//   baseUrl: string,
//   relKey: string,
//   apiKey: string
// ): Promise<string> {
//   const downloadApiUrl = new URL(
//     "v1/storage/downloadUrl",
//     ensureTrailingSlash(baseUrl)
//   );
//   downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
//   const response = await fetch(downloadApiUrl, {
//     method: "GET",
//     headers: buildAuthHeaders(apiKey),
//   });
//   return (await response.json()).url;
// }

// function ensureTrailingSlash(value: string): string {
//   return value.endsWith("/") ? value : `${value}/`;
// }

// function normalizeKey(relKey: string): string {
//   return relKey.replace(/^\/+/, "");
// }

// function toFormData(
//   data: Buffer | Uint8Array | string,
//   contentType: string,
//   fileName: string
// ): FormData {
//   const blob =
//     typeof data === "string"
//       ? new Blob([data], { type: contentType })
//       : new Blob([data as any], { type: contentType });
//   const form = new FormData();
//   form.append("file", blob, fileName || "file");
//   return form;
// }

// function buildAuthHeaders(apiKey: string): HeadersInit {
//   return { Authorization: `Bearer ${apiKey}` };
// }

// export async function storagePut(
//   relKey: string,
//   data: Buffer | Uint8Array | string,
//   contentType = "application/octet-stream"
// ): Promise<{ key: string; url: string }> {
//   const { baseUrl, apiKey } = getStorageConfig();
//   const key = normalizeKey(relKey);
//   const uploadUrl = buildUploadUrl(baseUrl, key);
//   const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
//   const response = await fetch(uploadUrl, {
//     method: "POST",
//     headers: buildAuthHeaders(apiKey),
//     body: formData,
//   });

//   if (!response.ok) {
//     const message = await response.text().catch(() => response.statusText);
//     throw new Error(
//       `Storage upload failed (${response.status} ${response.statusText}): ${message}`
//     );
//   }
//   const url = (await response.json()).url;
//   return { key, url };
// }

// export async function storageGet(relKey: string): Promise<{ key: string; url: string; }> {
//   const { baseUrl, apiKey } = getStorageConfig();
//   const key = normalizeKey(relKey);
//   return {
//     key,
//     url: await buildDownloadUrl(baseUrl, key, apiKey),
//   };
// }
