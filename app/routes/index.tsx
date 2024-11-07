// import { useSession } from "vinxi/http";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/start";
import { convertToCoreMessages, streamText, Message, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { useChat } from "ai/react";
import { z } from "zod";

import games from "../games.json";

import { Input } from "../components/ui/input";

const system = `
  You are a helpful assistant that can search for video games in the provided database and provide information about them.
  You can use the "games" tool to get the list of all games.
`;

const chat = createServerFn(
  "POST",
  async ({ messages }: { messages: Message[] }) => {
    const result = await streamText({
      model: openai("gpt-4o"),
      messages: convertToCoreMessages(messages),
      maxSteps: 10,
      system,
      tools: {
        games: tool({
          description: "returns a list of games",
          parameters: z.object({}),
          execute: async () => {
            return games;
          },
        }),
      },
    });
    return result.toDataStreamResponse();
  }
);

export const Route = createFileRoute("/")({
  component: Home,
});

const chatFetchOverride: typeof window.fetch = async (input, init) => {
  return chat(JSON.parse(init!.body as string));
};

function Home() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    fetch: chatFetchOverride,
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
