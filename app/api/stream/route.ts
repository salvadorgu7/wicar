
export const runtime = "nodejs";

let controllers: ReadableStreamDefaultController[] = [];

function sendAll(payload: any) {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  const enc = new TextEncoder().encode(data);
  controllers.forEach((c) => { try { c.enqueue(enc); } catch {} });
}

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      controllers.push(controller);
      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: "HELLO" })}\n\n`));
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  sendAll(body);
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
}
