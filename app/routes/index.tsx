import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/start";
import { openai } from "@ai-sdk/openai";
import { convertToCoreMessages, streamText, Message } from "ai";
import { useChat } from "ai/react";

import { Input } from "../components/ui/input";

const chat = createServerFn(
  "POST",
  async ({ messages }: { messages: Message[] }) => {
    const result = await streamText({
      model: openai("gpt-4-turbo"),
      messages: convertToCoreMessages(messages),
    });
    return result.toDataStreamResponse();
  }
);

export const Route = createFileRoute("/")({
  component: Home,
});

const fetch: typeof window.fetch = async (input, init) => {
  return chat(JSON.parse(init!.body as string));
};

function Home() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    fetch,
  });

  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      {messages.map((m) => (
        <div key={m.id} className="whitespace-pre-wrap">
          {m.role === "user" ? "User: " : "AI: "}
          {m.content}
        </div>
      ))}

      <form
        onSubmit={handleSubmit}
        className="fixed bottom-0 w-full max-w-md mb-8 border border-gray-300 rounded shadow-xl"
      >
        <Input
          className="w-full"
          value={input}
          placeholder="Say something..."
          onChange={handleInputChange}
        />
      </form>
    </div>
  );
}
