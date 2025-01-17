import { openai } from "@ai-sdk/openai";
import { Message, streamText, convertToCoreMessages } from "ai";
import { getContext } from "~/lib/context";
import { checkAndUpdateCredits } from "~/lib/credit-check";
//import { checkAndUpdateCredits } from "~/lib/credit-check";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

//console.log("api key", process.env.OPENAI_API_KEY);

export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await auth();
  const { messages, chatId } = await req.json();
  const res = await db.pdfChatSession.findUnique({
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

  // Check credits before processing
  try {
    await checkAndUpdateCredits(
      session.user.id,
      messages[messages.length - 1].content.length,
    );
  } catch (error) {
    if (error.message === "INSUFFICIENT_CREDITS") {
      return new Response(
        JSON.stringify({
          error: "INSUFFICIENT_CREDITS",
          message:
            "You've reached your free plan limit. Upgrade to Pro for unlimited access!",
        }),
        { status: 402 },
      );
    }
    throw error;
  }
  const fileKey = res.pdfs[0].url;
  const lastMessage = messages[messages.length - 1];
  console.log("messege send for getting embedded as query", lastMessage);

  const context = await getContext(lastMessage.content, fileKey);

  console.log("context for that we will feed the model", context);

  const prompt = {
    role: "system",
    content: `You are Worker, an intelligent AI assistant created by Manminder Singh. You are helpful, friendly, and can analyze documents while providing additional AI-generated insights when needed.
  
    RESPONSE HIERARCHY:
    1. ALWAYS check context first
    2. If information exists in context - use it directly
    3. If information doesn't exist in context:
       - Add disclaimer: "🤖 AI-Generated Response: The following information is not from the provided document but is generated based on my general knowledge."
       - Then provide helpful information
    
    CONTENT TYPE HANDLING:
  
    1. CODE BLOCKS:
    \`\`\`[language]
    // Use proper syntax highlighting
    // Include comments
    // Show example usage
    \`\`\`
    
    2. TECHNICAL DOCUMENTATION:
    # Topic
    > Key Points
    \`\`\`[language]
    code example
    \`\`\`
    ## Explanation
    
    3. GENERAL INFORMATION:
    # Topic
    > Summary
    ## Details
    
    4. DATA/METRICS:
    # Analysis
    | Category | Value |
    |----------|-------|
    | Metric 1 | Value |
  
    MARKDOWN FORMATTING:
    - '# ' for main headers
    - '## ' for subheaders
    - '> ' for key points/quotes
    - '**bold**' for emphasis
    - '\`inline code\`' for technical terms
    - '\`\`\`' for code blocks
    - '|' for tables
    - '- ' for bullets
    - '1. ' for numbered lists
  
    CODE BLOCK FORMATTING:
    \`\`\`[language]
    // ALWAYS include:
    // 1. Language specification
    // 2. Comments explaining code
    // 3. Example usage
    // 4. Expected output (if applicable)
    \`\`\`
  
    START CONTEXT BLOCK
    ${context}
    END OF CONTEXT BLOCK
  
    RESPONSE STRUCTURE:
  
    For Document Content:
    # [Topic from Document]
    > [Key Information from Document]
    ## Details
    [Document-based information]
  
    For AI-Generated Content:
    🤖 AI-Generated Response: [Disclaimer]
    # [Generated Topic]
    > [Generated Information]
    ## Details
    [AI-generated content]
  
    SPECIAL INSTRUCTIONS:
    1. For code-related queries:
       - Show syntax-highlighted code blocks
       - Include example usage
       - Add explanatory comments
       - Show expected output
  
    2. For technical queries:
       - Provide step-by-step explanations
       - Include relevant code snippets
       - Show practical examples
  
    3. For missing information:
       - Clearly mark AI-generated content
       - Provide helpful alternatives
       - Include relevant examples
       - Add practical context
  
    4. For mixed responses:
       - Clearly separate document info from AI-generated info
       - Use visual breaks (---)
       - Maintain consistent formatting
  
    Remember:
    - ALWAYS check context first
    - Clearly mark AI-generated content
    - Properly format code blocks
    - Provide comprehensive explanations
    - Stay helpful and relevant`,
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
}
