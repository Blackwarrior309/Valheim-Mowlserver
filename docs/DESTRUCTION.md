# Abriss-Spielplatz

In der Karte **💥 Karte zerlegen** oder in der 3D-Seitenleiste **💥 Zerstörungsmodus** öffnen. Die Kartenansicht wird zur lokalen Spielwiese. Links klicken oder auf dem Touchscreen tippen feuert auf das gewählte Ziel; Ziehen und Mausrad steuern weiterhin die Kamera.

- **Impulsgewehr:** sofortiger kleiner Explosionsstoß am Ziel.
- **Bombe:** geworfene Kugel mit ballistischer Flugbahn, Kollisionen und Zeitzünder.
- **Rakete:** sichtbarer Flug zum anvisierten Punkt, dann große Explosion.
- **Sprengkraft:** Radius und Impuls zwischen halber und doppelter Stärke.
- **Alles sprengen:** löst die geladenen sichtbaren Bauteile und Natur-Instanzen in begrenzten Portionen.
- **Physik anhalten:** friert Geschosse, Effekte und Trümmer ein; die Kamera bleibt beweglich.
- **Reset:** setzt sämtliche betroffenen Instanzmatrizen exakt zurück und entfernt die Physikkörper.
- **Modus beenden / Escape:** Reset und Rückkehr zur normalen Bedienung. Verbergen des Waffenmenüs beendet den Modus nicht; derselbe Menüknopf öffnet es wieder.

Die Waffen verändern ausschließlich die Darstellung in diesem Browser. Weltdatei, Kisten, Projekte, Server und andere Besucher werden nicht verändert. Es gibt keine Netzwerk-Nachrichten für Explosionen. Ein Gebietswechsel, Grafikwechsel oder Neuladen der Live-Karte räumt den Spielplatz auf. Laufen, Flugmodus, Bauauswahl und Zeitraffer sind währenddessen gesperrt, damit deren Kollisionen/Instanzmatrizen nicht widersprüchlich werden.

## Physik und Grenzen

Die Simulation verwendet **cannon-es 0.20.0**, mit Schwerkraft, starren Körpern, Drehimpulsen, Reibung, Kollisionen und Schlafzuständen. Physikkörper sind orientierte Box-Näherungen der exportierten Geometrie; Türblatt und Rahmen werden als ein abgelöstes Bauobjekt dargestellt. Geschosse und Trümmer kollidieren mit einem begrenzten Ausschnitt der noch stehenden Gebäude und einem lokalen Höhenfeld des vorhandenen Geländes. Raketen fliegen zum beim Abschuss bestimmten Treffpunkt; Bomben sind physikalische Kugeln. Explosionen erzeugen Blitze/Funken/Rauch. Das Gelände wird nicht verformt, und es gibt keine vollständige Statik- oder Valheim-Tragwerkssimulation.

Damit große Basen bedienbar bleiben, gibt es höchstens 320 sichtbare Trümmer, 12 Geschosse, 18 Explosionseffekte, 1800 statische Baukörper und 96 lokale Gelände-Kacheln. Ältere Trümmer werden bei Überschreiten des Limits ausgeblendet; ihre ursprünglichen Bauteile bleiben bis zum Reset entfernt. Alle geladenen Instanzen werden von „Alles sprengen“ in Portionen verarbeitet. Verborgene Ebenen und nicht geladene Weltteile gehören nicht dazu. Grafik- und Welt-Snapshots selbst bleiben unverändert.

## Wartung und Prüfungen

`lib/cannon.min.js` ist ein lokales IIFE-Bundle von cannon-es 0.20.0 (MIT), gebaut mit esbuild 0.28.2. Lizenz: `lib/cannon.LICENSE.txt`. Keine CDN-Abhängigkeit zur Laufzeit. Reproduktion mit temporär installierten npm-Paketen: `esbuild node_modules/cannon-es/dist/cannon-es.js --bundle --format=iife --global-name=CANNON --minify --outfile=lib/cannon.min.js`.

`node --test tools/test-destruction.cjs` prüft Fallen/Kollisionen, exaktes Zurücksetzen, unveränderte Quelldaten, Ressourcenbesitz, Pausieren, Bomben/Raketen, Grenzwerte und Abrisswarteschlange. Die Teilen-HTML-Datei enthält auch Physikbibliothek und Spielplatz.
