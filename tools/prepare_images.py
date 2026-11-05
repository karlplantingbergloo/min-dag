"""Gör om NASA:s stora bilder till lagom stora bilder för appen.

  img/day-global.jpg    hela jorden, dag    (2048 x 1024)
  img/day-detail.jpg    Europa/Norden, dag  (4096 x 2048)
  img/night-global.jpg  hela jorden, natt   (2048 x 1024)
  img/night-detail.jpg  Europa/Norden, natt (4096 x 2048)

Detaljbilderna täcker longitud DETAIL_LON och latitud DETAIL_LAT (samma värden
finns i js/earth.js). Körs automatiskt av GitHub.
"""
import os
import sys

from PIL import Image

Image.MAX_IMAGE_PIXELS = None

DETAIL_LON = (-40.0, 88.0)   # 128 grader
DETAIL_LAT = (22.0, 86.0)    # 64 grader


def crop_box(w, h):
    x0 = (DETAIL_LON[0] + 180) / 360 * w
    x1 = (DETAIL_LON[1] + 180) / 360 * w
    y0 = (90 - DETAIL_LAT[1]) / 180 * h
    y1 = (90 - DETAIL_LAT[0]) / 180 * h
    return tuple(round(v) for v in (x0, y0, x1, y1))


def make(src, out_dir, name, quality):
    im = Image.open(src).convert("RGB")
    print(name, "källa", im.size)
    im.resize((2048, 1024), Image.LANCZOS).save(
        os.path.join(out_dir, f"{name}-global.jpg"), quality=quality, optimize=True, progressive=True)
    im.crop(crop_box(*im.size)).resize((4096, 2048), Image.LANCZOS).save(
        os.path.join(out_dir, f"{name}-detail.jpg"), quality=quality, optimize=True, progressive=True)


def main():
    src_dir, out_dir = sys.argv[1], sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    make(os.path.join(src_dir, "blue-marble-november.jpg"), out_dir, "day", 84)
    make(os.path.join(src_dir, "black-marble.jpg"), out_dir, "night", 82)


if __name__ == "__main__":
    main()
