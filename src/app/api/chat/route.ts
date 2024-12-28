import { type NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";
interface Message {
  role: "user" | "model";
  content: string;
}
interface RequestBody {
  prompt: string;
  userId: string;
  chatSessionId?: string;
}
import { db } from "~/server/db";
import { useAuthStore } from "~/lib/store";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
// const chat = model.startChat({
//   history: [
//     {
//       role: "user",
//       parts: [{ text: "Hello" }],
//     },
//     {
//       role: "model",
//       parts: [{ text: "Great to meet you. What would you like to know?" }],
//     },
//   ],
// });
export async function POST(request: NextRequest) {
  try {
    const { prompt, userId, chatSessionId }: RequestBody = await request.json(); // Parse the request body

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
      });
    }
    let sessionId = chatSessionId;
    console.log("PONT--------1");

    if (!sessionId) {
      const session = await db.chatSession.create({
        data: {
          userId,
          title: "new chat session",
        },
      });
      sessionId = session.id;
    }
    console.log(sessionId);

    console.log("PONT--------2");
    // const rs = await db.chatSession.create({
    //   data: {
    //     userId,
    //     title: "new chat session",
    //   },
    // });

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
      });
    }

    const chatSession = await db.chatSession.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!chatSession) {
      return new Response(JSON.stringify({ error: "Chat session not found" }), {
        status: 404,
      });
    }

    const history = chatSession.messages.map((message) => ({
      role: message.sender.toLowerCase() as "user" | "model",
      parts: [{ text: message.content }],
    }));
    history.push({
      role: "user",
      parts: [{ text: prompt }],
    });
    const chat = model.startChat({ history });

    const result = await chat.sendMessage(prompt);

    console.log("----ponit333");

    await db.message.createMany({
      data: [
        {
          chatSessionId: sessionId,
          sender: "user",
          content: prompt,
        },
        {
          chatSessionId: sessionId,
          sender: "model",

          content: result.response.text(),
        },
      ],
    });

    // const result = await model.generateContent(prompt); // Generate content using GoogleGenerativeAI
    return new Response(
      JSON.stringify({
        response: result.response.text(),

        sender: result.response.candidates[0]?.content.role,
        chatSessionId: sessionId,
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in /api/chat:", error); // Log the error for debugging
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
}
