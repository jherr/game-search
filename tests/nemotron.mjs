const req1data = {
  model: "nemotron-mini", //"llama3.2",
  options: { temperature: 0 },
  messages: [
    {
      content:
        'You are a helpful assistant that can search for adoptable pets and provide information about them.  You can use the "pets" tool to get the list of all pets.',
      role: "system",
    },
    { content: "what dogs are available?", role: "user" },
    // {
    //   content: '<toolcall> {"type": "function", "arguments": {}} </toolcall>',
    //   role: "assistant",
    // },
    // {
    //   content: JSON.stringify([
    //     {
    //       type: "dog",
    //       name: "Rufus",
    //       age: 3,
    //       breed: "labrador",
    //       sex: "male",
    //       description: "a little crazy, Rufus is a lovable energetic dog",
    //     },
    //   ]),
    //   role: "tool",
    // },
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

const req1 = await fetch("http://127.0.0.1:11434/api/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(req1data),
});

const lines = (await req1.text()).split(/\n/);
let content = "";
for (const line of lines) {
  try {
    const d = JSON.parse(line);
    if (d.message && d.message.role === "assistant") {
      content += d.message.content;
    }
  } catch (e) {}
}

console.log(content);
