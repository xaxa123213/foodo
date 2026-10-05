// Tiny static server for Foodo (Bun) with a QR landing page.
import { file } from "bun";
import os from "node:os";

const PORT = Number(process.env.PORT || 3000);

function lanIPs() {
  const nets = os.networkInterfaces();
  const out = [];
  for (const list of Object.values(nets)) {
    for (const n of list || []) {
      if (n.family === "IPv4" && !n.internal) out.push(n.address);
    }
  }
  return out;
}

// Prefer the real Wi-Fi/Ethernet LAN IP, not VMware/virtual adapters.
function bestIP() {
  const nets = os.networkInterfaces();
  const skip = /vmware|virtualbox|vmnet|loopback|bluetooth|vethernet|hyper-v/i;
  const candidates = [];
  for (const [name, list] of Object.entries(nets)) {
    if (skip.test(name)) continue;
    for (const n of list || []) {
      if (n.family === "IPv4" && !n.internal) candidates.push({ name, ip: n.address });
    }
  }
  return (
    candidates.find((c) => c.ip.startsWith("192.168.")) ||
    candidates.find((c) => c.ip.startsWith("10.")) ||
    candidates[0]?.ip ||
    "127.0.0.1"
  );
}

const QR_HTML = (url) => `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Foodo QR</title>
<style>
  body{margin:0;height:100vh;display:grid;place-items:center;background:#fff7f2;
    font-family:-apple-system,sans-serif;color:#221a15;text-align:center}
  .box{background:#fff;padding:32px;border-radius:20px;box-shadow:0 8px 30px rgba(80,40,20,.12)}
  h1{margin:0 0 6px;font-size:22px} p{color:#8a7f78;margin:0 0 18px;font-size:14px}
  img{width:240px;height:240px} .u{margin-top:14px;font-size:13px;color:#8a7f78}
</style></head><body>
  <div class="box">
    <h1>🍳 Foodo</h1>
    <p>Scan with your iPhone camera</p>
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}" alt="QR">
    <div class="u">${url}</div>
  </div>
</body></html>`;

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/qr") {
      const force = url.searchParams.get("ip");
      const host = force || bestIP();
      return new Response(QR_HTML(`http://${host}:${PORT}`), {
        headers: { "Content-Type": "text/html" },
      });
    }
    let path = url.pathname === "/" ? "/index.html" : url.pathname;
    const f = file(`./src${path}`);
    if (await f.exists()) {
      return new Response(f, { headers: { "Cache-Control": "no-cache" } });
    }
    return new Response("Not found", { status: 404 });
  },
});

console.log(`\n  Foodo running:\n    http://localhost:${PORT}`);
console.log(`    QR page: http://localhost:${PORT}/qr`);
for (const ip of lanIPs()) console.log(`    http://${ip}:${PORT}`);
console.log("");
