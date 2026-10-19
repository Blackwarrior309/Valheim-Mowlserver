# Mowlserver – Live-Karte

**➜ Karte: https://blackwarrior309.github.io/Valheim-Mowlserver/**

Live-3D-Karte unseres Valheim-Servers. GitHub Actions holt die Welt etwa alle 5 Minuten per FTP vom Server,
wandelt sie um und veröffentlicht sie hier (Steam-IDs werden weggelassen).

Erstellt aus dem Template [Valheim Welt-Viewer](https://github.com/Blackwarrior309/Valheim-welt).
Anleitung und Einstellungen: [docs/LIVE-MAP.md](docs/LIVE-MAP.md). Neue Versionen des Viewers: Dateien aus dem Template übernehmen.

Inoffizielles Fan-Projekt, nicht mit Iron Gate verbunden.

Grafikoption **Valheim Original**: exportierte Spielmodelle und Texturen, bei Bedarf
im Browser geladen. Export, Abdeckung und Grenzen: [Originalgrafik](docs/ORIGINAL-GRAPHICS.md).

Routen mit Portalwechseln, Änderungsansicht, teilbare Orte, benannte 3D-Räume mit
Kistensuche und gemeinsame Bauprojekte: [Kartenwerkzeuge](docs/MAP-WORKSPACE.md).

## Changelog

**19.10.2026**
- Neuer Tab „Live-Spieler“: kompakte Kampfübersicht mit Live-Vitalwerten, kritischem Leben, Datenalter, Filter und Vollbild.
- 3D: Wikinger packen und werfen – in der 3D-Ansicht mit der Maus (ziehen + loslassen), im Laufmodus mit E (hochheben) und E/Klick (werfen). Mitspieler im Laufmodus sehen das bei sich und fliegen wirklich; Mod-Figuren nur im eigenen Viewer.
- 3D-Menü unten: „🛏 Schlafen“ – wer im Bett liegt und wer noch fehlt (braucht Mod 0.6.2; „im Bett“ ist nur für dich und Mitspieler in deiner Nähe bekannt).
- Betten: auch Ashwood- und Heubett werden erkannt; Lag-Diagnose läuft wieder.

**18.10.2026**
- 2D-Karte: neue Ebene „Betten“ 🛏 mit Besitzername (im Filter ein-/ausschaltbar).
- Neuer Tab „⤓ Dungeon“ (nur sichtbar mit Mod 0.6.1 auf dem eigenen PC): Grundriss der Krypta/Höhle, in der du gerade bist – besuchte Räume, Gegner mit Sternen und HP, Truhen mit Inhalt, Surtlingkerne, Schrotthaufen, Mitspieler.
- Mod 0.6.0: Werte von Mitspielern in deiner Nähe (Leben, Ausdauer, Eitr, Ausrüstung mit Stufe, tot/schläft) in der Spielerkarte; neue Kartenebene „Gegner & Tiere (Mod)“ – rot feindlich, gelb harmlos, grün gezähmt, pink Boss, mit Sternen, auch in Dungeons.
- Mitspieler wieder immer in einem gemeinsamen Raum; benannte Bereiche und Bauprojekte werden automatisch mit allen Besuchern geteilt.
- Türen öffnen sich im Laufmodus um ihre echten Scharniere (Codex).
- Spielerkarten mit Leben, Ausdauer, Eitr, Ausrüstung und Statistik – braucht den Mod „Valheim Welt Live“ 0.5.0 (Codex).
- Kartenwerkzeuge: Routen über mehrere Portale und mit Geländewegen, Änderungsansicht (neu grün / entfernt rot), teilbare 3D-Ansichten, benannte 3D-Bereiche mit Kistensuche, gemeinsame Bauprojekte (Codex).
- Rohstoff-Karte: unabgebautes Kupfer, Zinn, Silber, Obsidian, Teer, Schrott, Riesenreste, Schwarze Kerne, Chitin und Flammenmetall aus dem Spielstand; dazu Schrott, Teer und Kerne in unerkundeten Orten laut Seed (hohl markiert, mit Anzahl).
- Routenplaner zum Herstellen: löst den ganzen Rezeptbaum auf (Schmelzen, Spinnen, Raffinieren …), sucht die Zutaten in allen Kisten und zeigt den Weg als Liste, auf der Karte und in 3D.
- 3D: Tag-Nacht-Rhythmus – wie auf dem Server, eigener Ablauf oder schnell; Uhrzeit einstellbar und anhaltbar.
- 3D: Online-Spieler als laufende Figuren statt Kapseln.
- Kartentisch: Pins mit Ersteller auf der Karte und in der Bestenliste („📍 Pins · ☠ Bosse“); auf dem Kartentisch Aufgedecktes zählt als erkundet.
- Filterliste für die 2D-Karte (Basen, Spieler, Portale, Tode, Pins, Spawn, Bosse, Händler, Quests, Dungeons, Dörfer, Nester, Material, Dvergr-Lager, Rohstoffe).
- 3D: ganze Welt inklusive unerkundeter Gebiete (letzter Eintrag unter „Gebiet“).
- „🎮 Mein Spiel live zeigen“: mit dem Mod auf dem eigenen PC erscheint die eigene Figur live auf der Online-Karte, auch für andere Besucher.
- Ganze Weltkarte mit Höhen, Flüssen und Wäldern (Daten von valheim-map.world); Unerkundetes abgedunkelt. Biome für jede Welt aus dem Seed berechnet (eigener Nachbau des Weltgenerators, an 2809 Messpunkten geprüft).
- Bauteile mit offiziellen deutschen Namen; Truhen, Portale und Treppen stehen jetzt richtig auf dem Boden.
- Laufmodus (G): eigene Figur in 3rd Person bis Ich-Perspektive, Treppen, Türen und Eisentore öffnen, Kisten öffnen (E), Portale benutzen, hoch springen (Umschalt + Leertaste); Mitspieler im Browser sehen sich.
- Grafik „Valheim Original“ als Standard (falls das Grafikpaket da ist, sonst Natur).

**16.10.2026**
- Hersteller von Gegenständen in der Bestenliste („Hergestellt“).
- Grafikstufe „Realistisch“ mit gemalten Texturen; Himmel, Licht, Nebel und Wasser je Biom; Schatten am PC an.
- Fast 300 weitere Bauteile mit Maßen und deutschen Namen.
- „Server abfragen“ startet den Abgleich direkt; Kurzprotokoll an jedem Lauf.

**15.10.2026**
- Live-Karte eingerichtet: Abgleich etwa alle 5 Minuten per FTP, „Aktualisieren“-Knopf, letztes Update sichtbar.
- Bau-Verlauf (Zeitraffer), Portal-Netz, Tode, Bestenliste, Gebäude-Export für PlanBuild, Rezepte und Baukosten, Kisten-Suche im Spiel.
