
export const runtime = "nodejs";
export async function POST(req: Request) {
  const body = await req.text();
  console.log("PAGARME WEBHOOK:", body.slice(0, 300));
  return new Response("ok");
}
