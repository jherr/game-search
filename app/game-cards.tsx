import { useState, useEffect } from "react";
import { createServerFn } from "@tanstack/start";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";

import games from "./games.json";

type Game = (typeof games)[number];

const getGameById = createServerFn("GET", (id: string) => {
  return games.find((g) => g.id === id);
});

function GameCard({ id, reason }: { id: string; reason: string }) {
  const [game, setGame] = useState<Game>();

  useEffect(() => {
    getGameById(id).then(setGame);
  }, [id]);

  if (!game) return null;

  return (
    <Card className="max-w-sm">
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

export function GameCards({
  games,
}: {
  games: {
    id: string;
    reason: string;
  }[];
}) {
  return (
    <div className="flex flex-wrap gap-4 mt-4">
      {games.map((g) => (
        <GameCard key={g.id} id={g.id} reason={g.reason} />
      ))}
    </div>
  );
}
