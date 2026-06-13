import handler from '../api/ai-analyst.ts';
import dotenv from 'dotenv';
dotenv.config();

async function runTest() {
  console.log("=== Testing AI Analyst Handler ===");
  const req = {
    method: 'POST',
    body: {
      ssId: "1IQCs35RQlMMQsGB-CRczJeuRqa8WIxW4Sy_kjZyHP2M",
      query: "какие расходы на детей",
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
