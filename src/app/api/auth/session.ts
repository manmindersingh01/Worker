import { auth } from "~/server/auth"; // Adjust this path as needed

export default async function GET() {
  try {
    const session = await auth(); // Get the session from the server
    if (!session?.user) {
      return new Response(
        JSON.stringify({ error: "User not authenticated" }),
        {},
      );
    }

    // Send back the userId to the client
    return new Response(JSON.stringify({ userId: session.user.id }), {
      status: 200,
    });
  } catch (error) {
    console.error("Error fetching session:", error);
    return new Response(JSON.stringify({ error: "Error fetching session" }), {
      status: 500,
    });
  }
}
