# Min dag

En personlig startsida för dagen i Stockholm: datum, soltider, kalender, uppgifter och en levande jord i bakgrunden.

- **Jorden** visar hur den är belyst just nu, efter den riktiga tiden i Stockholm. Dagsidan är NASA Blue Marble (november), nattsidan NASA Black Marble.
- **Tema** ändras under *Mer*: Automatisk (följer solen), Alltid ljust eller Alltid mörkt.
- **Uppgifter** sparas i webbläsaren på den enhet du använder. Kalender, inkorg, väder och jobbsök är exempeldata.

## Hur den publiceras

Allt körs gratis på GitHub Pages. Varje gång något ändras i `main` gör GitHub automatiskt så här (se `.github/workflows/pages.yml`):

1. Hämtar NASA-bilderna (`tools/fetch_nasa.py`).
2. Gör om dem till lagom stora bilder (`tools/prepare_images.py`).
3. Publicerar appen med bilderna.

Om NASA flyttar sina filer kan du ange nya adresser under *Settings → Secrets and variables → Actions → Variables* med namnen `BLUE_MARBLE_URL` och `BLACK_MARBLE_URL`.

Bilder: NASA Earth Observatory (Blue Marble Next Generation, Reto Stöckli) och NASA Black Marble 2016.
