import fetch from 'node-fetch';

async function testAddIncome() {
  const url = 'http://localhost:3000/api/sheets'; // Assuming local dev server
  const payload = {
    action: "addTransaction",
    targetSheet: "Transactions",
    id: "test-income-" + Date.now(),
    date: new Date().toISOString(),
    type: "income",
    sourceName: "Test Salary",
    destinationName: "Test Card",
    tagName: "test",
    sourceAmount: 1000,
    sourceCurrency: "RUB",
    sourceAmountUSD: 10,
    targetAmount: 1000,
    targetCurrency: "RUB",
    targetAmountUSD: 10,
    ssId: "1IQCs35RQlMMQsGB-CRczJeuRqa8WIxW4Sy_kjZyHP2M", // Master ID
    demo: false
  };

  try {
    const response = await fetch(url + "?ssId=" + payload.ssId, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    });
    const result = await response.json();
    console.log("Result:", JSON.stringify(result, null, 2));
  } catch (e) {
    console.error("Error:", e);
  }
}

testAddIncome();
