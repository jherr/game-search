// import { useSession } from "vinxi/http";
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/start";

import pets from "../small-pets.json";

import { Input } from "../components/ui/input";

type Message = {
  role: "user" | "assistant" | "tool" | "system";
  content: string;
};

async function callAI(messages: Message[]) {
  const reqData = {
    model: "qwen2.5", //"hermes3", //"granite3-dense:8b",
    options: { temperature: 0 },
    messages: [
      {
        content:
          'You are a helpful assistant that can search for adoptable pets and provide information about them.  You can use the "pets" tool to get the list of all pets.',
        role: "system",
      },
      ...messages.filter(({ role }) => role !== "system"),
    ],
    tools: [
      {
        function: {
          description: "returns a list of pets",
          name: "pets",
          parameters: {
            type: "object",
            properties: {},
            additionalProperties: false,
            $schema: "http://json-schema.org/draft-07/schema#",
          },
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

function parseToolCall(message: string) {
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

const chat = createServerFn(
  "POST",
  async ({ messages }: { messages: Message[] }): Promise<Message[]> => {
    let iterations = 0;
    while (iterations < 5) {
      const content = await callAI(messages);
      messages.push({
        role: "assistant",
        content,
      });
      const toolCall = parseToolCall(content);
      if (toolCall) {
        if (toolCall?.name === "pets") {
          messages.push({
            role: "tool",
            content: JSON.stringify(pets),
          });
        }
      } else {
        break;
      }
      iterations++;
    }
    return messages;
  }
);

export const Route = createFileRoute("/test")({
  component: Test,
});

function Test() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setInput("");
    setLoading(true);

    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setMessages(await chat({ messages: newMessages }));

    setLoading(false);
  };

  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      {messages
        .filter(({ role }) => role === "user" || role === "assistant")
        .map((m, index) => (
          <div key={index} className="whitespace-pre-wrap">
            {m.role === "user" ? "User: " : "AI: "}
            {m.content}
          </div>
        ))}

      {loading ? <div className="mt-5 italic">Thinking...</div> : null}

      <form
        onSubmit={handleSubmit}
        className="fixed bottom-0 w-full max-w-md mb-8 border border-gray-300 rounded shadow-xl"
      >
        <Input
          className="w-full"
          value={input}
          placeholder="Say something..."
          onChange={(e) => setInput(e.target.value)}
        />
      </form>
    </div>
  );
}
