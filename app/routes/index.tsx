import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "ai/react";

import { Input } from "../components/ui/input";

export const Route = createFileRoute("/")({
  component: Home,
});
import { createServerFn } from "@tanstack/start";

import { convertToCoreMessages, streamText, Message, tool } from "ai";
import { openai } from "@ai-sdk/openai";

import { z } from "zod";

import games from "../games.json";
import { GameCards } from "../game-cards";

const system = `
  You are a helpful assistant that can search for video games in our database of video games.
  You must use the "games" tool to get the list of all games in the database.
  You can use the "showGames" tool to show the list of games you would recommend to the user.
`;

const chat = createServerFn(
  "POST",
  async ({ messages }: { messages: Message[] }) => {
    const result = await streamText({
      model: openai("gpt-4o"),
      messages: convertToCoreMessages(messages),
      system,
      maxSteps: 10,
      tools: {
        games: tool({
          description: "returns a list of games",
          parameters: z.object({}),
          execute: async () => games,
        }),
        showGames: tool({
          description: "shows the list of recommended games",
          parameters: z.object({
            games: z.array(
              z.object({
                id: z.string().describe("the id of the game"),
                reason: z
                  .string()
                  .describe("the reason why the game was recommended"),
              })
            ),
          }),
        }),
      },
    });
    return result.toDataStreamResponse();
  }
);

const chatFetchOverride: typeof window.fetch = async (input, init) => {
  return chat(JSON.parse(init!.body as string));
};

function Home() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    fetch: chatFetchOverride,
    onToolCall: (toolCall) => {
      if (toolCall.toolCall.toolName === "showGames") {
        return "Handled by the UI";
      }
    },
  });

  return (
    <div className="flex flex-col py-10 px-10 text-2xl">
      {messages.map((m) =>
        m.toolInvocations ? (
          m.toolInvocations
            .filter((ti) => ti.toolName === "showGames")
            .map((ti) => (
              <div id={ti.toolCallId}>
                <GameCards games={ti.args.games} />
              </div>
            ))
        ) : (
          <div key={m.id} className="whitespace-pre-wrap">
            {m.role === "user" ? "User: " : "AI: "}
            {m.content}
          </div>
        )
      )}

      <form onSubmit={handleSubmit} className="fixed bottom-0 mb-10 w-full">
        <Input
          className="w-3/4 text-3xl py-8"
          value={input}
          placeholder="Ask me for recommendations about video games..."
          onChange={handleInputChange}
        />
      </form>
    </div>
  );
}
``;
