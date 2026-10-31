import sys, json, asyncio, base64, os
import numpy as np, cv2
from playwright.async_api import async_playwright
URL=sys.argv[1]; OUT=sys.argv[2]; os.makedirs(OUT,exist_ok=True)
CH="/home/user/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome"
res={"url":URL,"checks":[]}
def check(name,ok,info=""):
    res["checks"].append({"name":name,"ok":bool(ok),"info":str(info)[:300]}); print(("PASS " if ok else "FAIL ")+name, str(info)[:200])
def decode(png_bytes):
    img=cv2.imdecode(np.frombuffer(png_bytes,np.uint8),cv2.IMREAD_COLOR)
    d=cv2.QRCodeDetector(); txt,pts,_=d.detectAndDecode(img)
    if not txt:
        g=cv2.cvtColor(img,cv2.COLOR_BGR2GRAY); g=cv2.resize(g,None,fx=0.5,fy=0.5); txt,pts,_=d.detectAndDecode(g)
    return txt
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=CH,args=["--no-sandbox"])
        for (w,h,tag) in [(390,844,"mobile"),(1440,900,"desktop")]:
            ctx=await b.new_context(viewport={"width":w,"height":h},accept_downloads=True,device_scale_factor=2 if tag=="mobile" else 1)
            pg=await ctx.new_page(); errs=[]
            pg.on("console",lambda m: errs.append(m.text) if m.type=="error" else None)
            pg.on("pageerror",lambda e: errs.append(str(e)))
            await pg.goto(URL,wait_until="load"); await pg.wait_for_timeout(500)
            await pg.screenshot(path=f"{OUT}/{tag}-empty.png")
            await pg.fill("#pa","anish.demo@okaxis"); await pg.fill("#pn","Anish Chai Point"); await pg.fill("#am","49"); await pg.fill("#tn","Chai + samosa")
            await pg.wait_for_timeout(300)
            ov=await pg.evaluate("document.documentElement.scrollWidth>window.innerWidth+1")
            check(f"{tag}: no horizontal overflow",not ov)
            data=await pg.evaluate("document.getElementById('poster').toDataURL('image/png')")
            png=base64.b64decode(data.split(",")[1]); open(f"{OUT}/{tag}-poster-story.png","wb").write(png)
            txt=decode(png)
            check(f"{tag}: story poster QR decodes to UPI link", txt=="upi://pay?pa=anish.demo%40okaxis&pn=Anish%20Chai%20Point&am=49.00&cu=INR&tn=Chai%20%2B%20samosa", txt)
            await pg.screenshot(path=f"{OUT}/{tag}-filled.png")
            for st in ["shop","chai","event","noir"]:
                await pg.click(f"#styles .chip[data-k={st}]")
                for sz in ["square","a4","story"]:
                    await pg.click(f"#sizes .chip[data-k={sz}]"); await pg.wait_for_timeout(60)
                    data=await pg.evaluate("document.getElementById('poster').toDataURL('image/png')")
                    png=base64.b64decode(data.split(",")[1])
                    if tag=="desktop": open(f"{OUT}/poster-{st}-{sz}.png","wb").write(png)
                    t=decode(png); check(f"{tag}: {st}/{sz} QR decodes", t.startswith("upi://pay?pa=anish.demo%40okaxis"), t[:60])
            # invalid input
            await pg.fill("#pa","anish"); await pg.wait_for_timeout(100)
            msg=await pg.text_content("#pa-msg"); dis=await pg.is_disabled("#dl")
            check(f"{tag}: invalid UPI ID shows message & disables export", ("@" in msg) and dis, msg)
            await pg.fill("#am","12.345"); await pg.wait_for_timeout(100)
            check(f"{tag}: bad amount message", "decimal" in (await pg.text_content("#am-msg")))
            await pg.fill("#pa","anish.demo@okaxis"); await pg.fill("#am","49")
            # download
            async with pg.expect_download() as dl:
                await pg.click("#dl")
            d=await dl.value; path=await d.path(); bts=open(path,"rb").read()
            check(f"{tag}: download PNG valid", bts[:8]==b"\x89PNG\r\n\x1a\n" and len(bts)>20000, f"{d.suggested_filename} {len(bts)}B")
            # split bill
            await pg.click("#splitbox summary"); await pg.fill("#st","1000"); await pg.fill("#sp","3")
            out=await pg.text_content("#split-out"); check(f"{tag}: split 1000/3", "333.34" in out, out)
            await pg.click("#split-use"); v=await pg.input_value("#am"); check(f"{tag}: split amount applied", v=="333.34", v)
            # pay link + copy
            link=await pg.input_value("#paylink"); check(f"{tag}: pay link", "#/pay?pa=anish.demo%40okaxis" in link and "am=333.34" in link, link)
            await pg.click("#copy"); await pg.wait_for_timeout(200); t=await pg.text_content("#toast"); check(f"{tag}: copy toast", "copied" in t.lower(), t)
            wa=await pg.get_attribute("#wa","href"); check(f"{tag}: WhatsApp share link", wa.startswith("https://wa.me/?text="), wa[:80])
            # persistence
            await pg.reload(wait_until="load"); await pg.wait_for_timeout(300)
            check(f"{tag}: inputs persist after reload", (await pg.input_value("#pa"))=="anish.demo@okaxis")
            # pay page
            await pg.goto(link,wait_until="load"); await pg.wait_for_timeout(400)
            vis=await pg.is_visible("#payview"); href=await pg.get_attribute("#pv-pay","href"); name=await pg.text_content("#pv-name"); amt=await pg.text_content("#pv-amt")
            check(f"{tag}: pay page renders", vis and href.startswith("upi://pay?pa=anish.demo%40okaxis") and "Anish Chai Point" in name and "333.34" in amt, f"{name} {amt} {href}")
            q=await pg.locator("#pv-qr").screenshot(); t=decode(q); check(f"{tag}: pay page QR decodes", t==href, t[:70])
            await pg.screenshot(path=f"{OUT}/{tag}-paypage.png")
            await pg.goto(URL.split('#')[0]+"#/pay?pa=bad&am=x",wait_until="load"); await pg.wait_for_timeout(200)
            check(f"{tag}: broken pay link handled", await pg.is_visible("#pv-bad"))
            await pg.click("#pv-make"); await pg.wait_for_timeout(200); check(f"{tag}: back to maker", await pg.is_visible("#maker"))
            check(f"{tag}: zero console errors", len(errs)==0, errs[:3])
            await ctx.close()
        await b.close()
    res["passed"]=sum(c["ok"] for c in res["checks"]); res["total"]=len(res["checks"])
    json.dump(res,open(f"{OUT}/e2e.json","w"),indent=1); print(res["passed"],"/",res["total"])
asyncio.run(main())
