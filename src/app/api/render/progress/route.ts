import { NextResponse } from "next/server";
import { renderQueue } from "@/lib/render-queue";

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send(renderQueue.getProgress());

      const onProgress = (progress: unknown) => send(progress);
      renderQueue.on("progress", onProgress);

      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          cleanup();
        }
      }, 15000);

      const cleanup = () => {
        renderQueue.off("progress", onProgress);
        clearInterval(interval);
        try { controller.close(); } catch {}
      };
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
