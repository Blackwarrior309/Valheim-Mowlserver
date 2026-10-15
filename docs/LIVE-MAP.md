# Your own live map for your server

[Deutsch weiter unten](#deutsch)

A copy of this repository turns into a website that shows your dedicated server's world (e.g. Nitrado) as a live 3D map.
GitHub Actions fetches the world via FTP about every 10 minutes, converts it and publishes it on GitHub Pages.
No PC has to keep running, and you don't need the mod (it makes the map more up to date, see step 6).

> **Privacy:** GitHub Pages sites are public. Anyone with the link sees your bases, chest contents, portals and
> builder names. Steam IDs are always left out. Only do this if everyone on the server agrees.

## 1. Copy the repository

Open https://github.com/Blackwarrior309/Valheim-welt and click **Fork** (or **Use this template → Create a new repository**).
In a fork, open the **Actions** tab once and click **“I understand my workflows, go ahead and enable them”**.

## 2. Find your FTP login

Nitrado: web interface → your Valheim server → **FTP credentials** (host, port, user, password).
Other hosts have the same under “FTP” or “File access”.

## 3. Add the secrets

In your copy: **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Required | Example / meaning |
|---|---|---|
| `VS_FTP_HOST` | yes | `ms1234.gamedata.io` |
| `VS_FTP_USER` | yes | your FTP user |
| `VS_FTP_PASSWORD` | yes | your FTP password |
| `VS_FTP_PORT` | no | default `21` |
| `VS_FTP_DIR` | no | folder that contains `worlds_local`; found automatically if empty |
| `VS_WORLD` | no | world name; default: the largest world on the server |

Secrets are encrypted and never end up on the website.

## 4. Turn on GitHub Pages

**Settings → Pages → Build and deployment → Source: “GitHub Actions”.**

## 5. First run

**Actions → Live-Karte → Run workflow.** The first run takes a few minutes (download + conversion).
Afterwards your map is at `https://<your-name>.github.io/<repo-name>/` – the start page shows a “Live world” card.
Direct link that reloads every 5 minutes: `https://<your-name>.github.io/<repo-name>/?src=live/welt.vwelt&refresh=300`

From then on the workflow runs every ~10 minutes and only publishes when the server has saved a new state
(Valheim saves about every 30 minutes).

## 6. Optional: the server mod (more up to date)

With the mod on the server, the world is written every 5 minutes, independent of the server's save interval.
Guide: [SERVER.md](SERVER.md). The workflow picks up the mod's file automatically – nothing to change here.

## Troubleshooting

- **Run fails at “Welt vom Server holen”:** check the secrets (host without `ftp://`, correct port).
  The log (in German) lists the world folders it found (“Weltordner: …”).
- **Wrong world:** set `VS_WORLD` to the world name (the file name without `.db2`).
- **Map doesn't change:** the server only saves every ~30 min; in between the run log says “Keine Änderungen …” / “Mod-Dump unverändert” (no changes).
- **Stop it:** Actions → Live-Karte → “…” → Disable workflow.

---

<a id="deutsch"></a>
# Eigene Live-Karte für deinen Server

Eine Kopie dieses Repos wird zur Webseite, die die Welt deines dedizierten Servers (z. B. Nitrado) als Live-3D-Karte zeigt.
GitHub Actions holt die Welt etwa alle 10 Minuten per FTP, wandelt sie um und veröffentlicht sie auf GitHub Pages.
Kein PC muss laufen, und der Mod ist nicht nötig (er macht die Karte aktueller, siehe Schritt 6).

> **Datenschutz:** GitHub-Pages-Seiten sind öffentlich. Jeder mit dem Link sieht Basen, Kisteninhalte, Portale und
> Erbauer-Namen. Steam-IDs werden immer weggelassen. Nur machen, wenn alle auf dem Server einverstanden sind.

1. **Repo kopieren:** https://github.com/Blackwarrior309/Valheim-welt → **Fork** (oder **Use this template**).
   Im Fork einmal den Tab **Actions** öffnen und die Workflows aktivieren.
2. **FTP-Zugang:** Nitrado-Webinterface → Server → **FTP-Zugangsdaten** (Host, Port, Benutzer, Passwort).
3. **Secrets anlegen:** Settings → Secrets and variables → Actions → New repository secret:
   `VS_FTP_HOST`, `VS_FTP_USER`, `VS_FTP_PASSWORD` (Pflicht), optional `VS_FTP_PORT`, `VS_FTP_DIR`, `VS_WORLD`
   (Bedeutung siehe Tabelle oben). Secrets sind verschlüsselt und landen nie auf der Seite.
4. **Pages einschalten:** Settings → Pages → Source: **„GitHub Actions“**.
5. **Erster Lauf:** Actions → Live-Karte → **Run workflow**. Danach liegt die Karte unter
   `https://<dein-name>.github.io/<repo-name>/`, mit Live-Kachel auf der Startseite.
   Danach läuft der Workflow alle ~10 Minuten und veröffentlicht nur, wenn der Server neu gespeichert hat.
6. **Optional Server-Mod:** schreibt die Welt alle 5 Minuten, unabhängig vom Speichern. Anleitung: [SERVER.md](SERVER.md).
   Der Workflow nimmt die Mod-Datei automatisch.

**Probleme:** Lauf scheitert → Secrets prüfen (Host ohne `ftp://`, Port). Falsche Welt → `VS_WORLD` setzen.
Karte ändert sich nicht → der Server speichert nur alle ~30 Min. Abschalten → Actions → Live-Karte → Disable workflow.
