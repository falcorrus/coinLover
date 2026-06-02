import handler from "../api/sheets";
import dotenv from "dotenv";

dotenv.config();

// Mock response object
class MockResponse {
  statusCode: number = 200;
  jsonData: any = null;
  headers: Record<string, string> = {};

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  json(data: any) {
    this.jsonData = data;
    return this;
  }

  setHeader(name: string, value: string) {
    this.headers[name] = value;
    return this;
  }
}

async function runTests() {
  console.log("=== STARTING SECURITY TESTS FOR MASTER_SS_ID ===\n");

  const MASTER_SS_ID = "1IQCs35RQlMMQsGB-CRczJeuRqa8WIxW4Sy_kjZyHP2M";
  process.env.ADMIN_TOKEN = "test-admin-secret-token-2026";

  // Test Case 1: Unauthorized access to MASTER_SS_ID directly (No Token)
  {
    console.log("Test Case 1: Direct access to MASTER_SS_ID (No Token)");
    const req = {
      method: "GET",
      url: `/api/sheets?ssId=${MASTER_SS_ID}`,
      query: { ssId: MASTER_SS_ID },
      headers: {},
      body: null
    };
    const res = new MockResponse();
    
    await handler(req as any, res as any);
    
    console.log(`Response Status: ${res.statusCode}`);
    console.log(`Response JSON: ${JSON.stringify(res.jsonData)}`);
    if (res.statusCode === 403 && res.jsonData.error === "unauthorized_admin") {
      console.log("✅ SUCCESS: Correctly blocked unauthorized direct access to MASTER_SS_ID.\n");
    } else {
      console.log("❌ FAILED: Failed to block unauthorized direct access to MASTER_SS_ID.\n");
    }
  }

  // Test Case 2: Unauthorized access to MASTER_SS_ID directly (Wrong Token)
  {
    console.log("Test Case 2: Direct access to MASTER_SS_ID (Wrong Token)");
    const req = {
      method: "GET",
      url: `/api/sheets?ssId=${MASTER_SS_ID}`,
      query: { ssId: MASTER_SS_ID },
      headers: { "x-admin-token": "wrong-token" },
      body: null
    };
    const res = new MockResponse();
    
    await handler(req as any, res as any);
    
    console.log(`Response Status: ${res.statusCode}`);
    console.log(`Response JSON: ${JSON.stringify(res.jsonData)}`);
    if (res.statusCode === 403 && res.jsonData.error === "unauthorized_admin") {
      console.log("✅ SUCCESS: Correctly blocked access with wrong token.\n");
    } else {
      console.log("❌ FAILED: Failed to block access with wrong token.\n");
    }
  }

  // Test Case 3: Access to 'master' pseudonym (No Token)
  {
    console.log("Test Case 3: Access to 'master' pseudonym (No Token)");
    const req = {
      method: "GET",
      url: `/api/sheets?ssId=master`,
      query: { ssId: "master" },
      headers: {},
      body: null
    };
    const res = new MockResponse();
    
    await handler(req as any, res as any);
    
    console.log(`Response Status: ${res.statusCode}`);
    console.log(`Response JSON: ${JSON.stringify(res.jsonData)}`);
    if (res.statusCode === 403 && res.jsonData.error === "unauthorized_admin") {
      console.log("✅ SUCCESS: Correctly blocked pseudonym access without token.\n");
    } else {
      console.log("❌ FAILED: Failed to block pseudonym access without token.\n");
    }
  }

  // Test Case 4: Authorized access to 'master' pseudonym (Valid Token)
  {
    console.log("Test Case 4: Authorized access to 'master' pseudonym (Valid Token)");
    const req = {
      method: "GET",
      url: `/api/sheets?ssId=master`,
      query: { ssId: "master" },
      headers: { "x-admin-token": "test-admin-secret-token-2026" },
      body: null
    };
    const res = new MockResponse();
    
    // We expect this to either succeed (200) or try to connect to Google Sheets and throw a different/network/credential error,
    // but it MUST bypass the 403 Token validation error.
    try {
      await handler(req as any, res as any);
      console.log(`Response Status: ${res.statusCode}`);
      console.log(`Response JSON: ${JSON.stringify(res.jsonData)}`);
      if (res.statusCode !== 403) {
        console.log("✅ SUCCESS: Correctly bypassed token check and proceeded to data fetch.\n");
      } else {
        console.log("❌ FAILED: Token check incorrectly blocked valid admin request.\n");
      }
    } catch (e: any) {
      // If it throws an error in Google Sheets connection, that means it successfully bypassed token check!
      console.log(`Proceeded to sheets call: connection error was thrown (expected since we are mocking/offline): ${e.message}`);
      console.log("✅ SUCCESS: Correctly bypassed token check and proceeded to sheets API.\n");
    }
  }
}

runTests().catch(console.error);
