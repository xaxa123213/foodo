// Foodo — phone preview: shows the real app inside an iPhone frame on your PC.
import { file } from "bun";

const PORT = Number(process.env.PORT || 3001);

const PREVIEW = (appUrl) => `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Foodo — iPhone preview</title>
<style>
  html,body{margin:0;height:100%;background:#e9e4df;font-family:-apple-system,sans-serif}
  body{display:grid;place-items:center}
  .wrap{display:flex;flex-direction:column;align-items:center;gap:12px}
  .phone{
    width:390px;height:844px;background:#000;border-radius:54px;
    padding:12px;box-shadow:0 30px 80px rgba(0,0,0,.35);position:relative;
  }
  .screen{
    width:100%;height:100%;border-radius:44px;overflow:hidden;background:#f6f4f1;
    position:relative;display:flex;flex-direction:column;
  }
  .notch{
    position:absolute;top:22px;left:50%;transform:translateX(-50%);
    width:120px;height:26px;background:#000;border-radius:20px;z-index:10;
  }
  .status{
    height:47px;flex-shrink:0;display:flex;align-items:center;justify-content:space-between;
    padding:4px 34px 0 44px;font-size:15px;font-weight:600;transition:background .25s;
  }
  .status i{font-style:normal;letter-spacing:1px;font-size:12px}
  iframe{width:100%;flex:1;border:0}
  .label{font-size:13px;color:#8a7f78}
</style></head>
<body>
  <div class="wrap">
    <div class="phone" id="phone"><div class="notch"></div><div class="screen">
      <div class="status" id="status"><span>9:41</span><i>●●● ▮</i></div>
      <iframe id="frame" src="${appUrl}"></iframe>
    </div></div>
    <div class="label">iPhone 14 view · 390×844 · this is a live preview</div>
  </div>
  <script>
    const phone = document.getElementById("phone");
    const fit = () => { phone.style.zoom = Math.min(1, (innerHeight - 50) / 868); };
    addEventListener("resize", fit); fit();
    // Mirror the app's background/text colour into the fake status bar.
    const frame = document.getElementById("frame"), status = document.getElementById("status");
    setInterval(() => {
      try {
        const cs = frame.contentWindow.getComputedStyle(frame.contentDocument.documentElement);
        status.style.background = cs.getPropertyValue("--bg");
        status.style.color = cs.getPropertyValue("--text");
      } catch {}
    }, 300);
  </script>
</body></html>`;

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/" || url.pathname === "/preview") {
      return new Response(PREVIEW("/app/"), { headers: { "Content-Type": "text/html" } });
    }
    if (url.pathname.startsWith("/app")) {
      let p = url.pathname.replace(/^\/app/, "") || "/";
      if (p === "/") p = "/index.html";
      const f = file(`./src${p}`);
      if (await f.exists()) return new Response(f, { headers: { "Cache-Control": "no-cache" } });
      return new Response("Not found", { status: 404 });
    }
    if (url.pathname.startsWith("/mock")) {
      let p = url.pathname.replace(/^\/mock/, "") || "/";
      if (p === "/") p = "/index.html";
      const f = file(`./src/mock${p}`);
      if (await f.exists()) return new Response(f, { headers: { "Cache-Control": "no-cache" } });
      return new Response("Not found", { status: 404 });
    }
    return new Response("Not found", { status: 404 });
  },
});

console.log(`\n  Foodo iPhone preview: http://localhost:${PORT}\n`);
