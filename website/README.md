# De website van Coodoo

De website (coodoo.centrebrain.net) staat in `docs/` en wordt gemaakt met `node website/build.mjs`. Pas niet `docs/*.html` zelf aan: dat wordt overschreven.

- `pages/`: de pagina's, met `{{t:sleutel}}` waar een tekst komt.
- `i18n/<taal>.json`: de teksten per taal. Elke taal heeft dezelfde sleutels als `en.json`.
- `languages.json`: de talen, met hun adres (`/`, `/nl/`, `/de/`, `/es/`) en of ze online staan (`ready`).

Elke taal krijgt zijn eigen adres, met `hreflang`-verwijzingen naar de andere talen en een plek in `sitemap.xml`. Zo vindt Google elke taal apart.

## Een tekst aanpassen

Pas de tekst aan in elk `i18n/*.json`-bestand van een taal die online staat, en bouw de site opnieuw:

```
node website/build.mjs
```

## Duits of Spaans online zetten

`de.json` en `es.json` staan klaar met alle sleutels, maar nog zonder teksten.

1. Vul elke tekst in `i18n/de.json` (of `es.json`) in. Neem de HTML in de tekst over zoals in `en.json` (`<b>`, `<a href="…">`).
2. Zet in `languages.json` bij die taal `"ready": true`. Is er een handleiding in die taal, vul dan ook `manual` in.
3. Bouw de site: `node website/build.mjs`. Ontbreekt er nog een tekst, dan stopt het bouwen en zegt het welke.

De taalknoppen, de verwijzingen tussen de talen en de sitemap komen er dan vanzelf bij.

## Een nieuwe sleutel

Een nieuwe tekst in een pagina krijgt een nieuwe sleutel, bijvoorbeeld `{{t:prijs-noot}}`. Zet die sleutel in elk `i18n/*.json`-bestand. Bij een taal die nog niet online staat mag de tekst leeg blijven.
