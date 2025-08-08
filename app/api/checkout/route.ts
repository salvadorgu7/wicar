
export const runtime = "nodejs";

export async function POST(req: Request) {
  const { amount } = await req.json().catch(() => ({ amount: 0 }));
  // Quando tiver Pagar.me real, chamar a API e retornar a URL/ID real
  const url = "https://pagar.me/sandbox-checkout";
  return new Response(JSON.stringify({ checkoutUrl: url, amount }), {
    headers: { "Content-Type": "application/json" },
  });
}
