import handler from './api/sheets.js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function runTest() {
  console.log("Testing API Handler with local .env.local...");
  
  const req = {
    method: 'GET',
    url: '/api/sheets?demo=true',
    query: { demo: 'true' },
    body: {}
  };
  
  const res = {
    status: (code) => {
      console.log(`HTTP STATUS: ${code}`);
      return {
        json: (data) => console.log(`RESPONSE:`, JSON.stringify(data, null, 2)),
        end: (msg) => console.log(`END: ${msg}`)
      };
    },
    setHeader: (name, val) => console.log(`HEADER: ${name}=${val}`)
  };

  try {
    await handler(req, res);
  } catch (err) {
    console.error("HANDLER CRASHED:", err);
  }
}

runTest();