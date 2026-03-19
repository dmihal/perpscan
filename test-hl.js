async function testHyperliquid() {
  try {
    console.log("Fetching Hyperliquid Meta and Asset Contexts...");
    const res = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "metaAndAssetCtxs" })
    });
    
    const data = await res.json();
    
    // data is an array: [meta, assetCtxs]
    const meta = data[0];
    const ctxs = data[1];
    
    console.log(`Found ${meta.universe.length} markets.`);
    console.log("First market:", meta.universe[0].name);
    console.log("First market context:", ctxs[0]);
    
    // Let's test clearinghouseState for a random address (e.g., a known active trader or just a dummy one)
    // We'll use a dummy address just to see the structure
    const dummyAddress = "0x0000000000000000000000000000000000000000";
    console.log(`\nFetching clearinghouseState for ${dummyAddress}...`);
    const res2 = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "clearinghouseState", user: dummyAddress })
    });
    
    const data2 = await res2.json();
    console.log("Clearinghouse state keys:", Object.keys(data2));
    if (data2.assetPositions) {
      console.log("Number of positions:", data2.assetPositions.length);
    }
    
  } catch (err) {
    console.error("Error:", err);
  }
}

testHyperliquid();
