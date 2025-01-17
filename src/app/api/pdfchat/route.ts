import { openai } from "@ai-sdk/openai";
import { Message, streamText, convertToCoreMessages } from "ai";
import { getContext } from "~/lib/context";
import {
  checkAndUpdateCredits,
  InsufficientCreditsError,
} from "~/lib/credit-check";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
export async function POST(req: Request) {
  try {
    console.log("request reached backend");

    const session = await auth();
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const { messages, chatId } = await req.json();
    const chatSession = await db.pdfChatSession.findUnique({
      where: {
        id: chatId,
      },
      include: {
        pdfs: true,
      },
    });

    if (!chatSession) {
      return new Response(JSON.stringify({ error: "Chat session not found" }), {
        status: 404,
      });
    }

    // Check credits before processing
    try {
      // await checkAndUpdateCredits(
      //   session.user.id,
      //   messages[messages.length - 1].content.length,
      // );
      const credits = await db.user.findUnique({
        where: { id: session.user.id },
        select: { credits: true },
      });
      // credit usage as per length
      const usage = messages[messages.length - 1].content.length / 4;

      if (credits.credits - usage < 0) {
        console.log("Ensufficient credits");
        return new Response(
          JSON.stringify({
            error: "INSUFFICIENT_CREDITS",
            message: "You don't have enough credits to perform this action",
          }),
          { status: 402 },
        );
      }
      await db.user.update({
        where: { id: session.user.id },
        data: {
          credits: credits.credits - usage,
        },
      });
    } catch (error) {}

    const fileKey = chatSession.pdfs[0].url;
    const lastMessage = messages[messages.length - 1];
    const context = await getContext(lastMessage.content, fileKey);

    const prompt = {
      role: "system",
      content: `You are Worker...`, // Your existing prompt
    };

    const result = streamText({
      model: openai("gpt-3.5-turbo"),
      messages: [
        prompt,
        ...messages.filter((message: Message) => message.role === "user"),
      ],
      temperature: 0.7,
      onFinish: async ({ response }) => {
        try {
          console.log("response from model", response.messages);
        } catch (error) {
          console.log("error", error);
        }
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Error in PDF chat API:", error);
    return new Response(
      JSON.stringify({
        error: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
      }),
      { status: 500 },
    );
  }
}
