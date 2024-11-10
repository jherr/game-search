import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export type Message = {
  role: "user" | "assistant" | "tool" | "system";
  content: string;
};

export async function callAI(messages: Message[]) {
  const reqData = {
    model: "qwen2.5", // "qwen2.5" //"hermes3", //"granite3-dense:8b",
    options: { temperature: 0 },
    messages: [
      {
        content: `You are a helpful assistant that can search for video games in the provided database and provide information about them. You must use the "games" tool to get the list of all games.`,
        role: "system",
      },
      ...messages.filter(({ role }) => role !== "system"),
    ],
    tools: [
      {
        function: {
          description: "returns a list of games",
          name: "games",
          parameters: zodToJsonSchema(
            z.object({
              genre: z
                .enum(["Simulation", "Action", "Strategy", "RPG", "Adventure"])
                .describe("The genre of the game"),
            })
          ),
        },
        type: "function",
      },
    ],
  };

  const req = await fetch("http://127.0.0.1:11434/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(reqData),
  });

  let content = "";
  const decoder = new TextDecoder();
  for await (const line of req.body) {
    try {
      const d = JSON.parse(decoder.decode(line));
      if (d.message && d.message.role === "assistant") {
        content += d.message.content;
      }
    } catch (e) {}
  }

  return content;
}

export function parseToolCall(message: string) {
  const trimmed = message.trim().replace(/\n/g, "");
  if (trimmed.startsWith("<|tool_call|>")) {
    // Granite format
    const toolCall = JSON.parse(trimmed.replace("<|tool_call|>", ""));
    return toolCall[0];
  } else if (trimmed.startsWith("<tool_call>")) {
    // Hermes/Qwen format
    const toolCall = JSON.parse(
      trimmed.replace("<tool_call>", "").replace("</tool_call>", "")
    );
    return toolCall;
  } else {
    // Llama 3.x/OpenAI format
    try {
      const toolCall = JSON.parse(trimmed);
      if (typeof toolCall === "object") {
        return toolCall;
      }
    } catch (e) {}
  }
}
