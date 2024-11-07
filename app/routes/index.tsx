// import { useSession } from "vinxi/http";
import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/start";
import { convertToCoreMessages, streamText, Message, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { useChat } from "ai/react";
import { z } from "zod";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

import games from "../games.json";

type Game = (typeof games)[number];

import { Input } from "../components/ui/input";

const getGameById = createServerFn("GET", (id: string) => {
  return games.find((g) => g.id === id);
});

const system = `
  You are a helpful assistant that can search for video games in the provided database and provide information about them.
  You can use the "games" tool to get the list of all games.
  You can use the "showGames" tool to show the list of games you would recommend to the user.
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

export const Route = createFileRoute("/")({
  component: Home,
});

const chatFetchOverride: typeof window.fetch = async (input, init) => {
  return chat(JSON.parse(init!.body as string));
};

function GameCard({ id, reason }: { id: string; reason: string }) {
  const [game, setGame] = useState<Game>();

  useEffect(() => {
    getGameById(id).then(setGame);
  }, [id]);

  if (!game) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {game.name} <span className="font-light">({game.releaseYear})</span>
        </CardTitle>
        <CardDescription className="line-clamp-3">
          {game.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <img src={game.image} alt={game.name} />
        <h1 className="text-lg font-bold my-3">
          Why you should play this game
        </h1>
        <p>{reason}</p>
      </CardContent>
    </Card>
  );
}

function GameCards({
  games,
}: {
  games: {
    id: string;
    reason: string;
  }[];
}) {
  return (
    <div className="flex flex-col gap-4 mt-4">
      {games.map((g) => (
        <GameCard key={g.id} id={g.id} reason={g.reason} />
      ))}
    </div>
  );
}

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
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
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
