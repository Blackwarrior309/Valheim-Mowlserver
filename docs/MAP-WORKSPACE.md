# Kartenwerkzeuge, Räume und gemeinsame Bauprojekte

## Routen

In **Kisten → Routen-Einstellungen** lässt sich ein bestimmter Online-Spieler,
die aktuelle 3D-Position oder die Werkstation als Start wählen. Ein Rezept suchen
und „Route planen“ drücken. Der Planer kann mehrere eindeutig gepaarte Portale
hintereinander verwenden. Für übliche Metall-/Erzmaterialien bleiben Portale
gesperrt, solange „Welt erlaubt Metall durch Portale“ nicht aktiviert ist.

Die Wegsuche nutzt das verfügbare Höhenraster, vorhandene Bodenflächen und grobe
Wandhindernisse. Bootswege sind optional; Steigungen und Wasser beeinflussen den
Weg. Portalwahl und Kistenreihenfolge sind Heuristiken, keine Garantie für die
weltweit kürzeste Route. Wenn die Raster-Suche einen Abschnitt mit Gebäudehindernissen nicht bestätigen
kann, versucht sie zunächst einen Geländeweg ohne diese Hindernisse. Er erscheint
**orange gestrichelt** als nicht vollständig geprüft. Ist auch kein Geländeweg
auffindbar, bleibt eine ausdrücklich gezählte Luftlinie. Die Oberfläche nennt
die Anzahl ungeprüfter und reiner Luftlinienabschnitte. Gebäudeinnenräume, Stockwerke und
unbekannte Gebiete brauchen weiterhin eine Prüfung im Spiel.

## Änderungsansicht

In der 3D-Seitenleiste:

- **Aktuellen Stand merken** vergleicht folgende Live-Updates mit diesem Stand.
- **Älteren Stand laden** liest eine `.vwelt` oder einen JSON-Snapshot derselben Welt.
- **Seit 24 Stunden** rekonstruiert den vorherigen Zustand aus dem vorhandenen
  Server-Verlauf, bezogen auf die Zeit des angezeigten Snapshots. Ohne Verlauf
  kann stattdessen eine Vergleichsdatei verwendet werden.

Neue Spielerbauteile werden grün gefärbt, entfernte Teile als rote Umrisse
dargestellt. Position, Typ und Rotation bestimmen die Identität: Ein versetztes
Teil erscheint als entfernt und neu. Kisteninhalte werden nicht verglichen.
Die roten Umrisse sind vereinfachte Begrenzungsformen.

## Orte und Mitspieler-Räume

**Aktuelle 3D-Ansicht teilen** erzeugt einen Link mit Welt, Gebiet, Weltkoordinaten,
Zoom und Blickrichtung. Das Öffnen stellt diese Ansicht wieder her. Der Link
enthält die Kamera, nicht die Weltdatei: Die Datenquelle muss beim Empfänger
erreichbar sein. Ein localhost-Link funktioniert nur auf demselben Rechner.

**Mitspieler-Einladungslink** erzeugt einen zufällig benannten Raum. „Beitreten“
öffnet ihn; Personen mit demselben Link sehen sich dort. Dies trennt die
Browser-Figuren von der allgemeinen Karte, ersetzt aber keine Anmeldung oder
Zugriffskontrolle eines eigenen Brokers.

## Benannte 3D-Bereiche

1. In 3D den Bereichsnamen eingeben, z. B. „Schmiedekeller“.
2. Die Unterkante in Metern über dem Meeresspiegel und eine positive Höhe angeben.
3. „Zwei Ecken in 3D markieren“ drücken und zwei gegenüberliegende Ecken anklicken.
4. Der Raum erscheint als türkisfarbener Rahmen mit Namen. Escape/Abbrechen
   beendet eine unfertige Markierung.

Die beiden Klicks bestimmen die Grundfläche; Unterkante und Höhe die vertikale
Ausdehnung. So können Räume übereinander liegen. Kisten werden anhand ihrer
Weltposition automatisch zugeordnet. Bei überlappenden Bereichen gewinnt der
kleinere Raum, bei gleichem Volumen die ID. Die Obergrenzen sind exklusiv:
Eine Kiste genau auf der Geschossgrenze gehört nur zum oberen Geschoss.

„Kisten“ am Bereich öffnet die gefilterte Liste. Die Kistensuche findet auch
Bereichsnamen; beide Kistenansichten besitzen einen Bereichsfilter. Name und
Höhe lassen sich bearbeiten, die Grundfläche erneut markieren.

## Gemeinsame Projekte

Die Kistenansicht enthält Projekte mit Namen, Verantwortlichem, Status und
Materialbedarf (`Holz;100`, eine Zeile pro Material). Der Bedarf lässt sich auch
aus in 3D ausgewählten Bauteilen oder einem PlanBuild-`.blueprint` übernehmen.
Unbekannte Baukosten werden gemeldet. Ein reiner `.vwplan` enthält nur Geometrie
und keine Materialliste und kann deshalb nicht als Kostenquelle dienen.

Optional wird ein bestimmter Bereich als Materiallager gewählt. Projekte
reservieren den verfügbaren Kistenbestand in ihrer Anlegereihenfolge. Spätere
Projekte erhalten nur den verbleibenden Bestand; fertige Projekte reservieren
nichts. Reservierungen ändern keine Kisten im Spiel und bestätigen keinen
tatsächlichen Baufortschritt. Der Status wird von den Teilnehmern gesetzt.

## Speichern und Synchronisieren

Bereiche und Projekte werden pro Welt im Browser gespeichert und in `.vwelt`-
und Teilen-HTML-Exporten mitgeführt. „Bereiche & Projekte“ exportiert zusätzlich
eine kleine JSON-Arbeitsdatei; Import führt Datensätze anhand ihrer IDs und
Änderungszeiten zusammen. Eigene Änderungen lassen sich rückgängig machen,
solange sie nicht durch eine neuere Änderung überschrieben wurden.

„Team verbinden“ schaltet die Synchronisierung ein. Gleicher Welt- und Teamname
verwendet denselben öffentlichen MQTT-Teamraum. Der Teamname ist kein Passwort.
Geteilt werden Raumnamen/-grenzen, Projekte, Verantwortliche und Materialbedarf.
Der Broker ist ein externer Dienst; Verfügbarkeit und Aufbewahrung werden nicht
garantiert. Lokales Speichern und Export/Import funktionieren auch ohne ihn.
Ein regelmäßiger JSON-Export sichert den Arbeitsstand unabhängig vom Broker.

Technisch gilt pro Datensatz die neuere Änderung (Zeitstempel, dann Client-ID).
Löschmarkierungen verhindern, dass alte Clients gelöschte Datensätze zurückbringen.
Gleichzeitige Änderungen desselben Projekts werden nicht feldweise zusammengeführt.

## Leistung und Tests

Grafikprofile bündeln Naturdichte, Auflösung und Schatten. Gebäudemodelle werden
in räumliche 128-m-Gruppen aufgeteilt; Gruppen außerhalb des Kamerabildes werden
nicht gezeichnet. Originalmodelle behalten ihre bisherigen Meshes und Texturen.
Der Viewer räumt beim Schließen Timer, Animationen, globale Ereignisse,
Verbindungen und Grafikressourcen auf. Eingehende Spielerpositionen werden
geprüft; die Zahl fremder Browser-Figuren ist auf 64 begrenzt.

```powershell
node --test tools/test-map-tools.cjs
node tools/test-graphics.cjs
python -m unittest discover -s tools -p test_graphics_export.py
```

Der Workflow `Viewer checks` führt diese Prüfungen bei Pushes und Pull Requests aus.


## Browser-Mitspieler: Verbindung und Lebensdauer

Unter dem Spielernamen zeigt die Karte den MQTT-Verbindungsstatus. Bei Unterbrechungen verbindet sich der Client automatisch erneut; „Erneut verbinden“ startet zusätzlich einen frischen Versuch. Nach erfolgreichem Abonnement wird die eigene Position sofort erneut gesendet.

Im sichtbaren Tab sendet eine laufende Browserfigur spätestens alle drei Sekunden ein Lebenszeichen. Ein Hintergrundtab meldet seine Browserfigur ab und meldet sie bei der Rückkehr wieder an. Ohne Lebenszeichen verschwinden entfernte Figuren nach ungefähr 20–23 Sekunden, auch in der Kartenansicht. Browser können Hintergrundtimer verzögern. Von der lokalen Spielverbindung gemeldete Figuren laufen nach sechs Sekunden ohne neue Daten aus; ihre Kennungen enthalten die Browsersitzung, damit mehrere Besucher sich nicht gegenseitig abmelden.

Nur leere MQTT-Nachrichten melden Figuren ab. Ungültiges JSON, falsche Topics, zu große Nachrichten und ungültige Koordinaten werden ignoriert. Es werden höchstens 64 entfernte Figuren gehalten; Positionsupdates derselben Figur werden auf höchstens eines pro 60 ms begrenzt. Beim Entfernen werden ihre Grafikressourcen freigegeben. Der öffentliche Broker bleibt ein unverbindlicher Präsenzdienst ohne Identitätsprüfung; seine Verfügbarkeit hängt vom Betreiber ab.

Prüfung: `node --test tools/test-multiplayer.cjs` simuliert Wiederverbinden, Tabwechsel, erneuten Verbindungsversuch, ungültige Nachrichten und Aufräumen ohne 3D-Animationsschleife.
