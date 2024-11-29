#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import originalGames from "./games.js";

const GameSchema = z.object({
  id: z.string(),
  name: z.string(),
  genre: z.string(),
  releaseYear: z.number(),
  description: z.string(),
  tags: z.array(z.string()),
  image: z.string(),
  price: z.string(),
  "positive-reviews": z.string(),
  purchasedOn: z.string().optional(),
});

type Game = z.infer<typeof GameSchema>;

const games: Game[] = originalGames;

const resources: {
  id: string;
  name: string;
  description: string;
  games: Game[];
}[] = [
  {
    id: "1",
    name: "My purchase games",
    description: "A list of games that I have purchased",
    games: games.filter((g) => g.purchasedOn),
  },
  {
    id: "2",
    name: "All games",
    description: "A list of all games",
    games: games,
  },
  {
    id: "3",
    name: "Action games",
    description: "A list of action games",
    games: games.filter((g) => g.genre === "Action"),
  },
  {
    id: "4",
    name: "FPS games",
    description: "A list of FPS games",
    games: games.filter((g) => g.genre === "FPS"),
  },
  {
    id: "5",
    name: "RPG games",
    description: "A list of RPG games",
    games: games.filter((g) => g.genre === "RPG"),
  },
  {
    id: "6",
    name: "Simulation games",
    description: "A list of simulation games",
    games: games.filter((g) => g.genre === "Simulation"),
  },
];

const server = new Server(
  {
    name: "games-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  }
);

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: resources.map(({ id, name, description }) => ({
      uri: `games:///${id}`,
      mimeType: "text/plain",
      name,
      description,
    })),
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const url = new URL(request.params.uri);
  const id = url.pathname.replace(/^\//, "");
  const resource = resources.find((g) => g.id === id);

  if (!resource) {
    throw new Error(`Game resource ${id} not found`);
  }

  return {
    contents: [
      {
        uri: request.params.uri,
        mimeType: "text/plain",
        name: resource.name,
        text: JSON.stringify(resource.games, null, 2),
      },
    ],
  };
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_games",
        description: "Get a list of games avaiable for purchase",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "purchased_games",
        description: "Get a list of games that this customer has purchased",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "list_games": {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(games, null, 2),
          },
        ],
        isError: false,
      };
    }
    case "purchased_games": {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              games.filter((g) => g.purchasedOn),
              null,
              2
            ),
          },
        ],
      };
    }
    default:
      throw new Error("Unknown tool");
  }
});

async function main() {
  const transport = new StdioServerTransport();

  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
