const http = require('http');

const userId = 'f9f5ef00-566a-46b1-a844-3427df7f8140';

function postJson(url, data) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(body),
          });
        } catch {
          resolve({
            status: res.statusCode,
            data: body,
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING WEBHOOK DUPLICATE PREVENTION TESTS ---');

  const randomTicket = Math.floor(Math.random() * 9000000) + 1000000;
  const payload = {
    user_id: userId,
    ticket: randomTicket,
    symbol: 'EURUSD',
    type: 'BUY',
    volume: 0.1,
    open_price: 1.08500,
    close_price: 1.09000,
    open_time: new Date(Date.now() - 3600000).toISOString(),
    close_time: new Date().toISOString(),
    profit: 50.00,
    commission: -0.50,
  };

  // TEST 1: Insert new trade
  console.log(`\n[Test 1] Sending payload for ticket ${randomTicket} (First time)...`);
  const res1 = await postJson('http://localhost:3000/api/webhook', payload);
  console.log('Response Status:', res1.status);
  console.log('Response Body:', res1.data);
  if (res1.status === 200 && res1.data.success === true) {
    console.log('✅ TEST 1 PASSED: Trade inserted successfully');
  } else {
    console.error('❌ TEST 1 FAILED');
  }

  // TEST 2: Send duplicate payload
  console.log(`\n[Test 2] Sending duplicate payload for ticket ${randomTicket} (Second time)...`);
  const res2 = await postJson('http://localhost:3000/api/webhook', payload);
  console.log('Response Status:', res2.status);
  console.log('Response Body:', res2.data);
  if (res2.status === 200 && res2.data.message === 'duplicate ticket ignored') {
    console.log('✅ TEST 2 PASSED: Duplicate ticket successfully ignored with 200 OK');
  } else {
    console.error('❌ TEST 2 FAILED');
  }

  // TEST 3: Send multiple distinct tickets concurrently
  console.log('\n[Test 3] Sending 5 distinct trades concurrently...');
  const promises = [];
  for (let i = 1; i <= 5; i++) {
    const t = randomTicket + i;
    const p = { ...payload, ticket: t };
    console.log(`Queueing ticket ${t}...`);
    promises.push(postJson('http://localhost:3000/api/webhook', p));
  }

  const results = await Promise.all(promises);
  let allPassed = true;
  results.forEach((res, idx) => {
    const ticket = randomTicket + idx + 1;
    console.log(`Ticket ${ticket} response status: ${res.status}, body:`, res.data);
    if (res.status !== 200 || res.data.success !== true) {
      allPassed = false;
    }
  });

  if (allPassed) {
    console.log('✅ TEST 3 PASSED: Concurrent distinct tickets successfully recorded');
  } else {
    console.error('❌ TEST 3 FAILED');
  }

  console.log('\n--- TESTS COMPLETED ---');
}

runTests().catch(console.error);
