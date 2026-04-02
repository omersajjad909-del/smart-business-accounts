import { NextRequest } from "next/server";
import { finovaChat, ChatMessage } from "@/lib/finovaAI";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json() as {
      message: string;
      history: ChatMessage[];
    };

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: "Missing message" }), { status: 400 });
    }

    const companyId = req.headers.get("x-company-id");

    const stream = await finovaChat(message, history, companyId);

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            controller.enqueue(encoder.encode(chunk));
          }
        } catch {
          controller.enqueue(encoder.encode("AI response is temporarily limited, but your data summary is available. Please try again in a moment."));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    console.error("AI chat error:", err);
    return new Response(
      JSON.stringify({ error: "AI service unavailable. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
