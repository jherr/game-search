import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/start";
import Markdown from "react-markdown";

import { Input } from "../components/ui/input";

import games from "../games.json";
import { callAI, Message, parseToolCall } from "../ollama-direct";

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
        if (toolCall?.name === "games") {
          let filteredGames = games;
          if (toolCall?.arguments?.genre) {
            filteredGames = games.filter(
              (g) => g.genre === toolCall.arguments.genre
            );
          }
          messages.push({
            role: "tool",
            content: JSON.stringify(filteredGames),
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

export const Route = createFileRoute("/direct")({
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
            <article className="prose-xl">
              <Markdown>{m.content}</Markdown>
            </article>
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
