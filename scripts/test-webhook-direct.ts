/**
 * Dispara el webhook de n8n directamente para un número ya renderizado.
 * Uso: npx tsx scripts/test-webhook-direct.ts <numero>
 */
import "dotenv/config";
import { sendWebhook } from "../src/lib/webhook";

async function main() {
  const numero = parseInt(process.argv[2] || "0");
  console.log(`Disparando webhook para número ${numero}...`);
  console.log(`URL: ${process.env.N8N_WEBHOOK_URL}\n`);

  const ok = await sendWebhook(numero);

  if (ok) {
    console.log("✅ Webhook enviado correctamente — revisar n8n para ver la ejecución");
  } else {
    console.log("❌ Webhook falló — revisar logs en la DB o la URL en .env");
  }
}

main().catch(console.error);
