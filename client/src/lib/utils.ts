import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 工具函数：将 JS Date 转换为本地 input 接受的 YYYY-MM-DDTHH:mm 格式
 * 解决 8 小时时区差导致的时间显示“怪异”问题
 */
export function formatToLocalDatetime(dateInput: string | Date | undefined): string {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";
  
  // 补偿本地时区偏移量
  const offset = date.getTimezoneOffset() * 60000; 
  const localISOTime = new Date(date.getTime() - offset).toISOString().slice(0, 16);
  return localISOTime;
};