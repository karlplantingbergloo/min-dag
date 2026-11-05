"""Hämtar NASA-bilderna som appen använder.

Körs automatiskt av GitHub (se .github/workflows/pages.yml) – du behöver aldrig köra den själv.

  * Blue Marble Next Generation, topografi + batymetri, NOVEMBER (world.topo.bathy.200411)
  * Black Marble 2016 (jorden på natten)

Adresserna letas upp hos NASA, så att skriptet fortsätter fungera även om NASA
flyttar filerna. Vill man tvinga en viss adress kan man sätta repo-variablerna
BLUE_MARBLE_URL och BLACK_MARBLE_URL.
"""
import os
import re
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

UA = {"User-Agent": "min-dag-build/1.0 (GitHub Actions)"}
VE = "https://visibleearth.nasa.gov"
# NASA har flyttat bildarkivet till assets.science.nasa.gov.
HOSTS = [
    "https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords",
    "https://eoimages.gsfc.nasa.gov/images/imagerecords",
]


def get(url, binary=False, tries=3, timeout=120):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                data = r.read()
                return data if binary else data.decode("utf-8", "replace")
        except Exception as e:  # noqa: BLE001
            last = e
            if i + 1 < tries:
                time.sleep(2 * (i + 1))
    raise last


def exists(url):
    try:
        req = urllib.request.Request(url, headers=UA, method="HEAD")
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status == 200 and int(r.headers.get("Content-Length") or "1000000") > 100000
    except Exception:  # noqa: BLE001
        return False


def url_for(host, rec, name):
    return f"{host}/{rec // 1000 * 1000}/{rec}/{name}"


def links_in(html):
    return set(re.findall(r'https?://[^\s"\'<>]+?\.(?:jpg|png)', html))


def pick(links, name_part, prefer):
    hits = [u for u in links if name_part in u]
    for p in prefer:
        for u in hits:
            if p in u:
                return u
    return hits[0] if hits else None


def find_blue_marble():
    prefer = ["3x21600x10800", "3x5400x2700"]
    # 1) Pröva bildarkivets nummer (flera åt gången) för novemberbilden.
    name = "world.topo.bathy.200411.3x5400x2700.jpg"
    for host in HOSTS:
        recs = list(range(73500, 74800))
        with ThreadPoolExecutor(32) as pool:
            oks = list(pool.map(lambda r: exists(url_for(host, r, name)), recs))
        hits = [r for r, ok in zip(recs, oks) if ok]
        print("Hittade i arkivet", host, hits, flush=True)
        for rec in hits:
            for size in prefer:
                u = url_for(host, rec, f"world.topo.bathy.200411.{size}.jpg")
                if exists(u):
                    return u
    # 2) Leta på Visible Earth efter november-sidan och läs länkarna där.
    for n in range(1, 30):
        try:
            html = get(f"{VE}/collection/1484/blue-marble?page={n}", tries=1, timeout=30)
        except Exception as e:  # noqa: BLE001
            print("Visible Earth svarade inte:", e, flush=True)
            return None
        found = set(re.findall(r'/images/(\d+)/([a-z0-9\-]+)', html))
        if not found:
            return None
        for rec, slug in sorted(found):
            if "nov" in slug and ("bathy" in slug or "topograph" in slug):
                try:
                    u = pick(links_in(get(f"{VE}/images/{rec}/{slug}", tries=1, timeout=30)), "world.topo.bathy.200411", prefer)
                except Exception:  # noqa: BLE001
                    u = None
                if u:
                    return u
    return None


def find_black_marble():
    for host in HOSTS:
        for name in ["BlackMarble_2016_3km.jpg", "BlackMarble_2016_01deg.jpg"]:
            u = url_for(host, 144898, name)
            if exists(u):
                return u
    html = get(f"{VE}/images/144898/earth-at-night-black-marble-2016-color-maps", tries=1, timeout=30)
    return pick(links_in(html), "BlackMarble_2016", ["3km.jpg", "01deg.jpg"])


def download(url, path):
    if os.path.exists(path) and os.path.getsize(path) > 100000:
        print("Finns redan:", path)
        return
    print("Laddar ner", url, flush=True)
    data = get(url, binary=True, timeout=600)
    with open(path, "wb") as f:
        f.write(data)
    print("  ", len(data) // 1024, "kB", flush=True)


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "nasa-src"
    os.makedirs(out, exist_ok=True)
    black = os.environ.get("BLACK_MARBLE_URL") or find_black_marble()
    print("Black Marble:", black, flush=True)
    blue = os.environ.get("BLUE_MARBLE_URL") or find_blue_marble()
    print("Blue Marble:", blue, flush=True)
    if not blue or not black:
        sys.exit(f"Hittade inte bilderna hos NASA (Blue Marble: {blue}, Black Marble: {black})")
    download(blue, os.path.join(out, "blue-marble-november.jpg"))
    download(black, os.path.join(out, "black-marble.jpg"))
    with open(os.path.join(out, "sources.txt"), "w") as f:
        f.write(f"{blue}\n{black}\n")


if __name__ == "__main__":
    main()
