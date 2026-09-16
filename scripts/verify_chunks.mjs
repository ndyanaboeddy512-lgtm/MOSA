async function checkAssets() {
  const res = await fetch("https://mosa-one.vercel.app/");
  const html = await res.text();
  const scriptRegex = /src="(\/_next\/static\/[^"]+)"/g;
  const linkRegex = /href="(\/_next\/static\/[^"]+)"/g;
  const assets = [];
  let m;
  while ((m = scriptRegex.exec(html)) !== null) assets.push(m[1]);
  while ((m = linkRegex.exec(html)) !== null) assets.push(m[1]);

  console.log(`Found ${assets.length} assets referenced in HTML.`);
  let failed = 0;
  for (const asset of assets) {
    const url = "https://mosa-one.vercel.app" + asset;
    const r = await fetch(url);
    if (!r.ok) {
      console.error(`❌ FAILED asset: ${asset} (${r.status})`);
      failed++;
    } else {
      console.log(`✅ Asset OK: ${asset} (${r.status}, ${r.headers.get("content-type")})`);
    }
  }

  if (failed === 0) {
    console.log("🎉 ALL ASSETS LOADED SUCCESSFULLY WITH HTTP 200!");
  } else {
    process.exit(1);
  }
}

checkAssets();
