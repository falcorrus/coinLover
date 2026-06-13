import handler from '../api/ai-analyst.ts';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

// Patch global fetch to inspect request body and write to file
const originalFetch = global.fetch;
global.fetch = async function (url, options) {
  if (url === "https://openrouter.ai/api/v1/chat/completions" && options && options.body) {
    const payload = JSON.parse(options.body);
    fs.writeFileSync('./scratch/sent_payload.json', JSON.stringify(payload, null, 2));
    console.log("Written sent payload to ./scratch/sent_payload.json");
  }
  return originalFetch.apply(this, arguments);
};

async function runTest() {
  console.log("=== Testing AI Analyst Handler ===");
  const req = {
    method: 'POST',
    body: {
      ssId: "1IQCs35RQlMMQsGB-CRczJeuRqa8WIxW4Sy_kjZyHP2M",
      query: "расходы на жилье по месяцам",
      history: []
    }
  };

  const res = {
    status: (code) => {
      return {
        json: (data) => console.log(`RESPONSE:\n`, data.choices[0].message.content),
        end: () => console.log(`END`)
      };
    },
    setHeader: (name, val) => {}
  };

  try {
    await handler(req, res);
  } catch (err) {
    console.error("HANDLER CRASHED:", err);
  }
}

runTest();
