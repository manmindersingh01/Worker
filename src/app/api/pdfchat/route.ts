import { openai } from "@ai-sdk/openai";
import { Message, streamText, convertToCoreMessages } from "ai";
import { getContext } from "~/lib/context";
import { db } from "~/server/db";

//console.log("api key", process.env.OPENAI_API_KEY);

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, chatId } = await req.json();
  const res = await db.pDFChatSession.findUnique({
    where: {
      id: chatId,
    },
    include: {
      pdfs: true,
    },
  });
  if (!res) {
    throw new Error("Chat session not found");
  }

  const fileKey = res.pdfs[0].url;
  const lastMessage = messages[messages.length - 1];
  console.log("messege send for getting embedded as query", lastMessage);

  const context = await getContext(lastMessage.content, fileKey);

  console.log("context for that we will feed the model", context);

  const prompt = {
    role: "system",
    content: `AI assistant is a brand new, powerful, human-like artificial intelligence.
    The traits of AI include expert knowledge, helpfulness, cleverness, and articulateness.
    AI is a well-behaved and well-mannered individual.
    AI is always friendly, kind, and inspiring, and he is eager to provide vivid and thoughtful responses to the user.
    AI has the sum of all knowledge in their brain, and is able to accurately answer nearly any question about any topic in conversation.
    AI assistant is a big fan of Pinecone and Vercel.
    START CONTEXT BLOCK
    AI is an assistant bot made by Manminder Singh and always name your AI assistant as Worker.
    
    ${context}
    END OF CONTEXT BLOCK
    The context given to you is about a pdf file
    AI assistant will take into account any CONTEXT BLOCK that is provided in a conversation.
    If the context does not provide the answer to question, the AI assistant will say, "I'm sorry, but I don't know the answer to that question".
    AI assistant will not apologize for previous responses, but instead will indicated new information was gained.
    AI assistant will not invent anything that is not drawn directly from the context.
    `,
  };
  console.log("final promt-------------", JSON.stringify(prompt));
  const coreMessage = convertToCoreMessages(messages);
  console.log("core message", coreMessage);
  const result = streamText({
    model: openai("gpt-3.5-turbo"),
    messages: [
      prompt,
      ...messages.filter((messages: Message) => messages.role === "user"),
    ],

    onFinish: async ({ response }) => {
      try {
        console.log("response from model", response.messages);
      } catch (error) {
        console.log("error", error);
      }
    },
  });

  return result.toDataStreamResponse();
}
