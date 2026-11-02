# AniWorld Total Tab Shield

Popup-Schutz und manuelle Buttons zum Überspringen von Openings und Endings mithilfe von Anime-Skip. Zwei Manifest-V3-Varianten, ein gemeinsamer Quellcode. Version 2.3.0.

## Installation

Die fertigen ZIPs entpacken. Aus dem Quellcode zuerst `npm run build` ausführen.

### Chromium / Chrome / Edge / Brave (ab Chromium 119)

1. `chrome://extensions` öffnen (Edge: `edge://extensions`).
2. Entwicklermodus aktivieren, **Entpackte Erweiterung laden** wählen.
3. Den entpackten Chromium-Ordner mit `manifest.json` auswählen; beim lokalen Build ist das `dist/chromium`.
4. Websitezugriff erlauben und bereits offene Seiten neu laden.

### Firefox Desktop (ab 140)

1. `about:debugging#/runtime/this-firefox` öffnen.
2. **Temporäres Add-on laden** wählen und `manifest.json` aus der entpackten Firefox-Variante auswählen (`dist/firefox` beim lokalen Build).
3. Websitezugriff in der Erweiterungsverwaltung erlauben und Seiten neu laden.

Temporäre Firefox-Add-ons werden beim Neustart entfernt. Für dauerhafte Installation im regulären Firefox muss das Add-on durch Mozilla signiert werden. Das ZIP ist noch nicht signiert und keine Store-Veröffentlichung.

## Verhalten und Grenzen

- Popup-Schutz für AniWorld, s.to, voe.sx, vidoza.net, streamtape.com, doodstream.com und opwiki.org sowie erkannte eingebettete Player.
- Der bestehende aggressive Schutz blockiert auch absichtlich geöffnete neue Tabs, Strg-/Mittelklicks und Links mit neuem Zielfenster auf geschützten Seiten.
- Skip-Buttons erscheinen nur auf AniWorld bei passenden Zeitmarken und HTML5-Videos. Kein automatisches Überspringen.
- Gemischte Intro-/Handlungsteile werden nicht übersprungen. Bei Laufzeitabweichungen über 30 Sekunden wird keine Zuordnung verwendet.
- Zeitmarken können je nach Schnittfassung trotzdem abweichen. Keine Garantie für jeden Hoster.
- Kein Browser-Picture-in-Picture oder Zugriff auf Videos in geschlossenen Shadow-DOMs.
- Firefox bietet `location.ancestorOrigins` nicht wie Chromium an. Bei verschachtelten Fremd-Frames ohne passenden Referrer können Popup- und Vollbild-Hooks ausbleiben; die isolierte Skip-Erkennung nutzt zusätzlich die Tab-URL.
- Zwischenspeicher nur im Hintergrundprozess, höchstens 30 Minuten; ein Neustart des Hintergrundprozesses leert ihn.

## Entwicklung

Voraussetzungen: Node.js ab 22 und Python ab 3.9. Keine npm-Laufzeitabhängigkeiten.

```sh
npm test
npm run build
```

- `src/`: gemeinsamer Quellcode; `service-worker.js` lädt die Chromium-Hintergrundskripte.
- `manifests/`: getrennte Browser-Manifeste; Versionen gemeinsam ändern.
- `scripts/build.py`: reproduzierbare ZIPs und entpackte Varianten unter `dist/`.
- `tests/`: Logik-, Manifest-, Syntax- und Hintergrundtests mit simulierten Browser-APIs.
- `.github/workflows/ci.yml`: Tests und Build bei Push/PR; ZIPs als Actions-Artefakt.

Validierung dieser Version: acht automatisierte Tests bestanden; Firefox `web-ext lint` ohne Fehler oder Warnungen. Android ist nicht getestet; das Manifest setzt dort wegen der Datenschutzdeklaration mindestens Version 142 voraus.

Die Tests ersetzen keine Browserprüfung. Vor einem Release in beiden Browsern Installation, Popup-Schutz, Hoster-iframe, Opening/Ending, Vollbild und Episodenwechsel prüfen. Live-Wiedergabe bei Hostern wurde für diese Version nicht getestet.

## GitHub

Diesen Projektordner als Repository verwenden. `dist/` ist absichtlich ignoriert; fertige Browser-ZIPs an ein GitHub Release anhängen. Das Quellarchiv enthält keine privaten Textnotizen aus dem ursprünglichen Ordner.

```sh
git init -b main
git add .
git commit -m "Prepare Chromium and Firefox extension variants"
# Anschließend ein eigenes GitHub-Repository als origin hinzufügen und pushen.
```

Es wurde keine neue Lizenz vergeben: Der ursprüngliche Ordner enthält keine Lizenz. Vor einer Freigabe als Open-Source-Projekt die Rechte klären und eine passende LICENSE ergänzen. Nicht mit AniWorld oder Anime-Skip verbunden.

## Datenschutz und technische Referenzen

Siehe [PRIVACY.md](PRIVACY.md). Der öffentliche, gemeinsam genutzte Anime-Skip-Client-Schlüssel stammt aus dem bestehenden Projekt und ist kein privates Zugangstoken; er kann stark limitiert sein.

- [Chromium Service Worker](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/basics)
- [Firefox Hintergrundskripte](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background)
- [Firefox Datenschutzdeklaration](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings)
- [Anime-Skip API-Client](https://github.com/anime-skip/api-client-ts)
