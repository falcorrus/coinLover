async function test() {
  const url = 'https://coin.reloto.ru/api/sheets';
  const payload = {
    action: 'findUserByContact',
    contact: 'ekirshin@gmail.com'
  };

  try {
    console.log("Sending request to dev server...");
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    console.log("Response status:", res.status);
    const data = await res.json();
    console.log("Response data:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Error:", e);
  }
}

test();
