import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type ModelMessage,
  type UIMessage,
} from "ai";
import { parseCitations, verifyCitations } from "~/lib/rag/citations";
import { retrieve } from "~/lib/rag/retrieve";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { MAX_MESSAGES_PER_USER } from "~/lib/limits";

// Retrieval (rewrite + hybrid + rerank) plus generation can exceed the Vercel
// Hobby default of 10s; raise to the Hobby maximum.
export const maxDuration = 60;
export const runtime = "nodejs";

// Source chip data carried to the client as a custom data part.
type SourceChip = {
  documentId: string;
  docName: string;
  page: number;
  snippet: string;
};

// UI message type for this route: standard parts plus a `data-sources` part.
type ChatUIMessage = UIMessage<never, { sources: SourceChip[] }>;

/** Extract plain text from a UIMessage (v6 parts) or a simple {role,content}. */
function messageText(m: unknown): string {
  if (!m || typeof m !== "object") return "";
  const obj = m as Record<string, unknown>;
  if (typeof obj.content === "string") return obj.content;
  if (Array.isArray(obj.parts)) {
    return obj.parts
      .filter(
        (p): p is { type: "text"; text: string } =>
          !!p &&
          typeof p === "object" &&
          (p as { type?: unknown }).type === "text" &&
          typeof (p as { text?: unknown }).text === "string",
      )
      .map((p) => p.text)
      .join("");
  }
  return "";
}

function messageRole(m: unknown): "user" | "assistant" | "system" | undefined {
  if (!m || typeof m !== "object") return undefined;
  const role = (m as { role?: unknown }).role;
  if (role === "user" || role === "assistant" || role === "system") return role;
  return undefined;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }
    const userId = session.user.id;

    const {
      messages,
      chatId,
      documentIds,
    }: {
      messages: unknown[];
      chatId: string;
      documentIds?: string[];
    } = await req.json();

    const incoming = Array.isArray(messages) ? messages : [];

    // Derive prior turns (history) and the latest user text.
    const lastUserText = (() => {
      for (let i = incoming.length - 1; i >= 0; i--) {
        if (messageRole(incoming[i]) === "user") return messageText(incoming[i]);
      }
      return "";
    })();

    const history = incoming
      .map((m) => ({ role: messageRole(m), content: messageText(m) }))
      .filter(
        (m): m is { role: "user" | "assistant"; content: string } =>
          (m.role === "user" || m.role === "assistant") && m.content.length > 0,
      )
      // history = prior turns only (exclude the final user message)
      .slice(0, -1);

    const chatSession = await db.pdfChatSession.findFirst({
      where: { id: chatId, userId },
      include: { documents: true },
    });
    if (!chatSession) {
      return new Response(JSON.stringify({ error: "Chat session not found" }), {
        status: 404,
      });
    }

    const userMsgCount = await db.message.count({
      where: { pdfChatSession: { userId }, sender: "user" },
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

    // Atomic credit debit: conditional update avoids the TOCTOU overdraft race.
    const usage = Math.ceil(lastUserText.length / 4);
    const debit = await db.user.updateMany({
      where: { id: userId, credits: { gte: usage } },
      data: { credits: { decrement: usage } },
    });
    if (debit.count === 0) {
      return new Response(
        JSON.stringify({
          error: "INSUFFICIENT_CREDITS",
          message: "You don't have enough credits to perform this action",
        }),
        { status: 402 },
      );
    }

    // Scope documentIds to this session: clients may only retrieve over
    // documents that belong to the loaded session.
    const sessionDocIds = new Set(chatSession.documents.map((d) => d.id));
    let scopedDocumentIds: string[] | undefined = undefined;
    if (Array.isArray(documentIds) && documentIds.length > 0) {
      const valid = documentIds.filter((id: string) => sessionDocIds.has(id));
      scopedDocumentIds = valid.length > 0 ? valid : undefined;
    }

    const r = await retrieve({
      query: lastUserText,
      history,
      userId,
      documentIds: scopedDocumentIds,
    });

    const contextBlocks = r.chunks
      .map((c) => `[${c.docName} p.${c.page}] ${c.content}`)
      .join("\n\n");

    let systemPrompt = `You are a grounded assistant answering questions about the user's PDF documents.

Answer ONLY using the provided context. Cite every claim inline using the exact format [DocName p.N] matching the sources. If the context does not contain the answer, say you don't know — do not invent. Be concise and well-formatted.

Context:
"""
${contextBlocks}
"""`;

    if (r.weakContext) {
      systemPrompt += `

The retrieved context is weak and may not cover the question. Strongly prefer telling the user that the documents do not appear to cover this rather than guessing.`;
    }

    const modelMessages: ModelMessage[] = await convertToModelMessages(
      incoming as ChatUIMessage[],
    );

    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      messages: modelMessages,
      temperature: 0.2,
      onFinish: async ({ text }) => {
        try {
          const verified = verifyCitations(parseCitations(text), r.chunks);
          console.log(
            `[pdfchat] finished chat=${chatId} verifiedCitations=${verified.length}`,
          );
          try {
            await db.message.createMany({
              data: [
                {
                  pdfChatSessionId: chatId,
                  sender: "user",
                  content: lastUserText,
                },
                { pdfChatSessionId: chatId, sender: "model", content: text },
              ],
            });
          } catch (persistErr) {
            console.error("[pdfchat] persistence failed", persistErr);
          }
        } catch (err) {
          console.error("[pdfchat] onFinish error", err);
        }
      },
    });

    const sources: SourceChip[] = r.chunks.map((c) => ({
      documentId: c.documentId,
      docName: c.docName,
      page: c.page,
      snippet: c.content.slice(0, 300),
    }));

    const stream = createUIMessageStream<ChatUIMessage>({
      execute: ({ writer }) => {
        writer.write({ type: "data-sources", id: "sources", data: sources });
        writer.merge(result.toUIMessageStream());
      },
    });

    return createUIMessageStreamResponse({ stream });
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
