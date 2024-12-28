import { type NextRequest } from "next/server";
import { db } from "~/server/db";

interface RequestBody {
  chatSessionId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json(); // Explicitly type the parsed JSON
    const { chatSessionId } = body;

    const res = await db.message.findMany({
      where: {
        chatSessionId,
      },
    });

    return new Response(JSON.stringify(res), { status: 200 });
  } catch (error) {
    console.error("Error handling POST request:", error);
    return new Response("Invalid request", { status: 400 });
  }
}
