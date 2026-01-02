import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4";
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

// --- 内置助教 Prompt ---
const SYSTEM_PROMPT = `你是一个集成在智慧教学平台中的专业 AI 助教。
你的目标是：
1. 协助学生理解复杂的课程知识点。
2. 引导学生思考作业题目，而非直接给出最终答案。
3. 语言风格应专业、鼓励且简洁。
4. 如果涉及到数学公式，请务必使用 LaTeX 格式（用 $ 或 $$ 包裹）。
5. 你的回答支持标准 Markdown 语法。`;

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  tool_choice?: any;
  response_format?: any;
};

export type InvokeResult = {
  id: string;
  choices: Array<{
    message: {
      role: Role;
      content: string;
      tool_calls?: any[];
    };
    finish_reason: string | null;
  }>;
};

// --- 格式化工具函数 ---
const ensureArray = (value: MessageContent | MessageContent[]): MessageContent[] => 
  Array.isArray(value) ? value : [value];

const normalizeContentPart = (part: MessageContent): any => {
  if (typeof part === "string") return { type: "text", text: part };
  return part;
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;
  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return { role, name, content: contentParts[0].text, tool_call_id };
  }
  return { role, name, content: contentParts, tool_call_id };
};

// --- 核心调用逻辑 ---
export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  if (!ENV.siliconflowApiKey) {
    throw new Error("SILICONFLOW_API_KEY is not configured in .env");
  }

  const { messages, tools, tool_choice, response_format } = params;

  // 注入 System Prompt
  const finalMessages = messages.map(normalizeMessage);
  const hasSystem = finalMessages.some(m => m.role === "system");
  
  const payloadMessages = hasSystem 
    ? finalMessages 
    : [{ role: "system", content: SYSTEM_PROMPT }, ...finalMessages];

  const payload: Record<string, unknown> = {
    // 你可以根据需求切换为 "deepseek-ai/DeepSeek-R1"
    model: ENV.aiModel,
    messages: payloadMessages,
    temperature: 0.7,
    max_tokens: 2048,
    stream: false,
  };

  if (tools) payload.tools = tools;
  if (tool_choice) payload.tool_choice = tool_choice;
  if (response_format) payload.response_format = response_format;

  const baseUrl = ENV.siliconflowApiBase.replace(/\/$/, "");
  const apiUrl = `${baseUrl}/chat/completions`;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ENV.siliconflowApiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SiliconFlow API Error: ${response.status} - ${errorText}`);
  }

  return (await response.json()) as InvokeResult;
}