import re, sys, urllib.request, ssl, json
domains = sys.argv[1:]
ctx = ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
def get(url):
    try:
        req = urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0 (compatible; sellmyhouse-contact-check/1.0)"})
        with urllib.request.urlopen(req, timeout=15, context=ctx) as r:
            return r.geturl(), r.read(600000).decode("utf-8","ignore")
    except Exception as e:
        return None, ""
for d in domains:
    found=set(); phones=set(); title=""; final=""
    for path in ["", "/contact", "/contact-us", "/contactus", "/en/contact-us", "/about-us"]:
        for host in ([f"https://www.{d}", f"https://{d}"] if not d.startswith("www.") else [f"https://{d}"]):
            u, html = get(host+path)
            if not html: continue
            final = final or u
            if not title:
                m = re.search(r"<title[^>]*>([^<]{1,90})", html, re.I); title = m.group(1).strip() if m else ""
            for e in re.findall(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", html):
                if re.search(r"\.(png|jpe?g|gif|webp|svg)$", e, re.I) or "sentry" in e or "example" in e or "wixpress" in e: continue
                found.add(e.lower())
            for p in re.findall(r"(?:\+?60|0)3[-\s]?\d{3,4}[-\s]?\d{4}", html):
                phones.add(re.sub(r"\s+"," ",p))
            break
    print(f"::notice title={d}::" + json.dumps({"site": final, "title": title, "emails": sorted(found)[:6], "phones": sorted(phones)[:3]})[:950])
