
# Wicar — Uber dos Lava-jatos

## Rodar local
1) Instale Node 18+
2) No terminal:
```
npm i
npm run dev
```
Abra http://localhost:3000

## Deploy (Vercel)
- Crie um projeto na Vercel, importe este diretório (repo do Git).
- Deploy padrão funciona.
- Endpoints:
  - /api/stream (SSE tempo real)
  - /api/checkout (stub de pagamento)
  - /api/webhook/pagarme (stub de webhook)

## Integração com Pagar.me (depois)
- Adicione PAGARME_SECRET_KEY nas variáveis da Vercel.
- Substitua o stub de /api/checkout por uma chamada real à API do Pagar.me.
