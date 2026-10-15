# Your own live map for your server

[Deutsch weiter unten](#deutsch)

A copy of this repository turns into a website that shows your dedicated server's world (e.g. Nitrado) as a live 3D map,
including a **time-lapse** of everything that gets built. GitHub Actions fetches the world via FTP about every 10 minutes,
converts it and publishes it on GitHub Pages. Free, no PC has to keep running, and the server needs no mod
(the mod makes the map more up to date, see step 6).

> **Privacy:** free GitHub Pages sites are public. Anyone with the link sees your bases, chest contents, portals and
> builder names. Steam IDs are always left out. Only do this if everyone on the server agrees.

## 1. Create your copy

**➜ [Use this template](https://github.com/new?template_owner=Blackwarrior309&template_name=Valheim-welt)**
(or the green **Use this template → Create a new repository** button on the repository page).
Pick a name, leave it **Public** (needed for free GitHub Pages) and click **Create repository**.

## 2. Turn on GitHub Pages

In your new repository: **Settings → Pages → Build and deployment → Source: “GitHub Actions”.**

## 3. Add your FTP login as secrets

Nitrado: web interface → your Valheim server → **FTP credentials** (host, port, user, password).
Other hosts have the same under “FTP” or “File access”.

In your repository: **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Required | Example / meaning |
|---|---|---|
| `VS_FTP_HOST` | yes | `ms1234.gamedata.io` (without `ftp://`) |
| `VS_FTP_USER` | yes | your FTP user |
| `VS_FTP_PASSWORD` | yes | your FTP password |
| `VS_FTP_PORT` | no | default `21` |
| `VS_FTP_DIR` | no | folder that contains `worlds_local`; found automatically if empty |
| `VS_WORLD` | no | world name; default: the largest world on the server |

Secrets are encrypted and never end up on the website.

## 4. Start it

**Actions → Live-Karte → Run workflow.** The first run takes a few minutes (download + conversion).
(The very first run right after creating the repository fails because Pages was still off – that's expected.)

## 5. Open your map

`https://<your-name>.github.io/<repo-name>/` – the start page shows a **Live world** card.
Direct link that reloads every 5 minutes: `https://<your-name>.github.io/<repo-name>/?src=live/welt.vwelt&refresh=300`

From then on the workflow runs every ~10 minutes and publishes whenever the server has saved a new state
(Valheim saves about every 30 minutes).

**Time-lapse:** every change to the buildings is recorded in the branch `verlauf` of your repository (a few KB each,
nothing is stored on the server). In the live map: **3D → Time-lapse** – drag the slider or press ▶, new pieces light up.

## 6. Optional: the server mod (more up to date)

With the mod on the server, the world is written every 5 minutes, independent of the server's save interval.
Guide: [SERVER.md](SERVER.md). The workflow picks up the mod's file automatically – nothing to change here.

## Updates

New viewer versions appear in the template. To update your copy, copy the changed files over
(or start a new copy and move the secrets). Your time-lapse history stays in your branch `verlauf`.

## Troubleshooting

- **Run fails:** check the secrets (host without `ftp://`, correct port). If a run had a problem, the branch `verlauf`
  contains a `fehler.txt` with the log (credentials removed).
- **Wrong world:** set `VS_WORLD` to the world name (the folder/file name without `.db2`).
- **Map doesn't change:** the server only saves every ~30 min.
- **Stop it:** Actions → Live-Karte → “…” → Disable workflow.

---

<a id="deutsch"></a>
# Eigene Live-Karte für deinen Server

Eine Kopie dieses Repos wird zur Webseite, die die Welt deines dedizierten Servers (z. B. Nitrado) als Live-3D-Karte zeigt –
mit **Zeitraffer** von allem, was gebaut wird. GitHub Actions holt die Welt etwa alle 10 Minuten per FTP, wandelt sie um
und veröffentlicht sie auf GitHub Pages. Kostenlos, kein PC muss laufen, auf dem Server ist kein Mod nötig.

> **Datenschutz:** kostenlose GitHub-Pages-Seiten sind öffentlich. Jeder mit dem Link sieht Basen, Kisteninhalte, Portale
> und Erbauer-Namen. Steam-IDs werden immer weggelassen. Nur machen, wenn alle auf dem Server einverstanden sind.

1. **Kopie erstellen:** **[Use this template](https://github.com/new?template_owner=Blackwarrior309&template_name=Valheim-welt)** →
   Namen wählen, **Public** lassen → **Create repository**.
2. **Pages einschalten:** im neuen Repo Settings → Pages → Source: **„GitHub Actions“**.
3. **FTP-Zugang als Secrets:** Nitrado-Webinterface → Server → **FTP-Zugangsdaten**. Dann im Repo
   Settings → Secrets and variables → Actions → New repository secret:
   `VS_FTP_HOST` (ohne `ftp://`), `VS_FTP_USER`, `VS_FTP_PASSWORD` (Pflicht), optional `VS_FTP_PORT`, `VS_FTP_DIR`, `VS_WORLD`.
   Secrets sind verschlüsselt und landen nie auf der Seite.
4. **Starten:** Actions → Live-Karte → **Run workflow**. Der allererste Lauf direkt nach dem Erstellen scheitert,
   weil Pages da noch aus war – das ist normal.
5. **Karte öffnen:** `https://<dein-name>.github.io/<repo-name>/` (Live-Kachel auf der Startseite).
   Danach aktualisiert sie sich etwa alle 10 Minuten, sobald der Server neu gespeichert hat.
   **Zeitraffer:** jede Bau-Änderung landet im Branch `verlauf` deines Repos (nicht auf dem Server).
   In der Live-Karte unter **3D → Zeitraffer** Schieberegler ziehen oder ▶ drücken, neue Teile leuchten gelb.
6. **Optional Server-Mod:** schreibt die Welt alle 5 Minuten, unabhängig vom Speichern. Anleitung: [SERVER.md](SERVER.md#deutsch).

**Probleme:** Lauf scheitert → Secrets prüfen; bei Fehlern liegt im Branch `verlauf` eine `fehler.txt` (ohne Zugangsdaten).
Falsche Welt → `VS_WORLD` setzen. Karte ändert sich nicht → der Server speichert nur alle ~30 Min.
Abschalten → Actions → Live-Karte → Disable workflow.
