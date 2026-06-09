import OpenAI from "openai";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { env } from "~/server/env";
import { MAX_MESSAGES_PER_USER } from "~/lib/limits";

// Generation can exceed the Vercel Hobby default of 10s; raise to the maximum.
export const maxDuration = 60;
export const runtime = "nodejs";

interface Message {
  role: "user" | "assistant" | "model";
  content: string;
}

interface RequestBody {
  messages: Message[];
}

const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export async function POST(request: Request) {
  try {
    // Trust only the session for identity — never the request body.
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const body = (await request.json()) as RequestBody;
    if (!body?.messages?.length) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
      });
    }
    const { messages } = body;

    const lastMessage = messages.at(-1);
    if (!lastMessage?.content) {
      return new Response(
        JSON.stringify({ error: "Last message content is required" }),
        { status: 400 },
      );
    }

    // Enforce the per-user message cap before generating.
    const userMsgCount = await db.message.count({
      where: { chatSession: { userId }, sender: "user" },
    });
    if (userMsgCount >= MAX_MESSAGES_PER_USER) {
      return new Response(
        JSON.stringify({
          error: "MESSAGE_LIMIT",
          message: `You've reached the ${MAX_MESSAGES_PER_USER}-message limit for this demo.`,
        }),
        { status: 429 },
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

    const oaMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: "You are a helpful, concise assistant." },
      ...messages.map((m) => ({
        role: (m.role === "user" ? "user" : "assistant") as
          | "user"
          | "assistant",
        content: m.content,
      })),
    ];

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: oaMessages,
      stream: true,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = "";

          for await (const part of completion) {
            const chunkText = part.choices[0]?.delta?.content ?? "";
            if (chunkText) {
              fullResponse += chunkText;
              controller.enqueue(encoder.encode(chunkText));
            }
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
    console.error("Error in /api/chat2:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
}
