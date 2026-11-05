"""Hämtar NASA-bilderna som appen använder.

Körs automatiskt av GitHub (se .github/workflows/pages.yml) – du behöver aldrig köra den själv.

  * Blue Marble Next Generation, topografi + batymetri, NOVEMBER (world.topo.bathy.200411)
  * Black Marble 2016 (jorden på natten)

Adresserna letas upp på NASA:s Visible Earth-sidor, så att skriptet fortsätter
fungera även om NASA flyttar filerna. Vill man tvinga en viss adress kan man sätta
miljövariablerna BLUE_MARBLE_URL och BLACK_MARBLE_URL.
"""
import os
import re
import sys
import time
import urllib.request

UA = {"User-Agent": "min-dag-build/1.0 (GitHub Actions)"}
VE = "https://visibleearth.nasa.gov"


def get(url, binary=False, tries=3):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=120) as r:
                data = r.read()
                return data if binary else data.decode("utf-8", "replace")
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(2 * (i + 1))
    raise last


def exists(url):
    try:
        req = urllib.request.Request(url, headers=UA, method="HEAD")
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status == 200 and int(r.headers.get("Content-Length", "1")) > 100000
    except Exception:  # noqa: BLE001
        return False


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
    # 1) Kända adresser (snabbast).
    for rec in ["73963", "73938", "73909", "73884", "73826", "73801"]:
        for size in prefer:
            u = f"https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/{rec}/world.topo.bathy.200411.{size}.jpg"
            if exists(u):
                return u
    # 2) Leta i Blue Marble-samlingen på Visible Earth.
    pages = set()
    for n in range(1, 40):
        try:
            html = get(f"{VE}/collection/1484/blue-marble?page={n}")
        except Exception:  # noqa: BLE001
            break
        found = set(re.findall(r'/images/(\d+)/([a-z0-9\-]+)', html))
        if not found:
            break
        for rec, slug in found:
            if "november" in slug and "bathymetry" in slug:
                pages.add(f"{VE}/images/{rec}/{slug}")
        if pages:
            break
    for p in sorted(pages):
        u = pick(links_in(get(p)), "world.topo.bathy.200411", prefer)
        if u:
            return u
    return None


def find_black_marble():
    prefer = ["BlackMarble_2016_3km.jpg", "BlackMarble_2016_01deg.jpg"]
    for name in prefer:
        u = f"https://eoimages.gsfc.nasa.gov/images/imagerecords/144000/144898/{name}"
        if exists(u):
            return u
    html = get(f"{VE}/images/144898/earth-at-night-black-marble-2016-color-maps")
    return pick(links_in(html), "BlackMarble_2016", ["3km.jpg", "01deg.jpg"])


def download(url, path):
    if os.path.exists(path) and os.path.getsize(path) > 100000:
        print("Finns redan:", path)
        return
    print("Laddar ner", url)
    data = get(url, binary=True)
    with open(path, "wb") as f:
        f.write(data)
    print("  ", len(data) // 1024, "kB")


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "nasa-src"
    os.makedirs(out, exist_ok=True)
    blue = os.environ.get("BLUE_MARBLE_URL") or find_blue_marble()
    black = os.environ.get("BLACK_MARBLE_URL") or find_black_marble()
    if not blue or not black:
        sys.exit(f"Hittade inte bilderna hos NASA (Blue Marble: {blue}, Black Marble: {black})")
    download(blue, os.path.join(out, "blue-marble-november.jpg"))
    download(black, os.path.join(out, "black-marble.jpg"))
    with open(os.path.join(out, "sources.txt"), "w") as f:
        f.write(f"{blue}\n{black}\n")


if __name__ == "__main__":
    main()
