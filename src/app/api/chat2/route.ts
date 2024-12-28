import { type NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "~/server/db";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

interface Message {
  role: "user" | "model";
  content: string;
}

interface RequestBody {
  messages: Message[];
  userId: string;
}

export async function POST(request: NextRequest) {
  try {
    const requestBody = (await request.json()) as RequestBody;

    if (
      !requestBody?.messages?.length ||
      typeof requestBody.userId !== "string"
    ) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
      });
    }

    const { messages, userId } = requestBody;
    const lastMessage = messages.at(-1);

    if (!lastMessage?.content) {
      return new Response(
        JSON.stringify({ error: "Last message content is required" }),
        { status: 400 },
      );
    }

    const chatSession =
      (await db.chatSession.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      })) ??
      (await db.chatSession.create({
        data: {
          userId,
          title: "new chat session",
        },
      }));

    const formattedHistory = messages.slice(0, -1).map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({
      history: formattedHistory,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = await chat.sendMessageStream(lastMessage.content);
          let fullResponse = "";

          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            fullResponse += chunkText;
            controller.enqueue(encoder.encode(chunkText));
          }

          await db.message.createMany({
            data: [
              {
                chatSessionId: chatSession.id,
                sender: "user",
                content: lastMessage.content,
              },
              {
                chatSessionId: chatSession.id,
                sender: "model",
                content: fullResponse,
              },
            ],
          });

          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in /api/chat:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
}
