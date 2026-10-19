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


## Spielerkarte (Live-Mod 0.5.0)

Ein Klick auf einen Spielermarker in der 2D-Karte, eine Figur oder deren Namensschild in 3D oder einen Eintrag in der Spielerliste öffnet dieselbe Karte. Sie bleibt beim Ansichtswechsel offen. Leben, Ausdauer, Eitr, Ausrüstung und beide Hände aktualisieren sich mit den Live-Daten. „Folgen“ führt die Kamera nach, „Gehe zu“ zentriert sie einmalig, „Ansicht wechseln“ wechselt zwischen Karte und 3D am Spieler. Manuelles Ziehen/Zoomen, Schließen oder Offlinegehen beendet das Folgen. Es gibt keinen Spiel-Teleport.

Der Mod liefert Detailwerte ausschließlich für den eigenen lokalen Charakter. Jeder Spieler, der seine Werte teilen möchte, benötigt den aktuellen Client-Mod und die aktive Funktion „Mein Spiel live zeigen“. Ein dedizierter Server und die Weltdatei kennen diese lokalen Vitalwerte und Gegenstände nicht zuverlässig. Reine Browserfiguren und ältere Clients zeigen dafür „–“. Bei Übertragungsausfall wechselt die Karte in den Offlinezustand und deaktiviert die Positionsaktionen. Die Teilen-Datei enthält ebenfalls die Spielerkarte.

`Spieler.ShareDetails` (Standard `true`) steuert die zusätzlichen API-Felder und ihre Erfassung. Über die aktive Spiel-Freigabe werden sie an die Besucher desselben MQTT-Kartenraums weitergereicht. Statistikdaten liegen lokal in `BepInEx/config/ValheimWeltLive/player-stats.json`, getrennt nach Weltname, Seed und Spielername. Spielzeit, Tode und zurückgelegte Fußstrecke werden ab Erfassungsbeginn beobachtet; Besuche zählen Spieleintritt/Sitzungen. Das sind keine rückwirkenden Charakter-Gesamtwerte. Schifffahrt, Schwimmen, Teleports und Sprünge durch Wiederbelebung werden nicht als Fußstrecke gezählt. Messintervalle und Spielabstürze können kleine Abweichungen verursachen; die Datei wird ungefähr alle 30 Sekunden und beim Beenden gespeichert.

Installation: Valheim beenden, die neue `ValheimWeltLive.dll` anstelle der vorhandenen DLL im Mod-Ordner ablegen und das Spiel neu starten. Für die Webfunktionen auch den mitgelieferten `web`-Ordner aktualisieren oder die aktuelle öffentliche Karte benutzen. Keine DLLs unter `valheim_Data/Managed` ersetzen.


## Türen im Laufmodus

Im Laufmodus (`G`) die Tür mit dem Fadenkreuz ansehen und `E` bzw. die Hand-Schaltfläche drücken. Reichweite: drei Meter ab Augenhöhe; feste Bauteile davor verhindern die Bedienung. Auch ein erreichbarer Rahmen kann zum Öffnen/Schließen dienen. Gedrückthalten von `E` schaltet die Tür nicht ständig um. Während der etwa 0,45 Sekunden langen Bewegung wird keine zweite Bedienung angenommen.

Originalgrafik: Für `wood_door`, `wood_gate`, `wood_fence_gate`, `darkwood_gate`, `stave_gate`, `iron_grate`, `flametal_gate`, `ashwood_door` und `piece_hexagonal_door` exportiert das Grafikwerkzeug das Türblatt, den originalen Drehpunkt und vorhandene Box-Kollider getrennt vom Rahmen. Nur das Blatt dreht sich um 90 Grad, vom Spieler weg. Rahmen und Pfosten bleiben stehen. Die Kollisionsbox des Blatts folgt der Bewegung und bleibt geöffnet wirksam; Rahmen verwenden die exportierten Box-Kollider. Mesh-Kollider und komplexe Physik werden weiterhin angenähert. Natur-/Einfachgrafik nutzt einen vereinfachten Türkörper mit einem Scharnier an der Kante.

Der lokale Zustand bleibt innerhalb der geöffneten Karte bei einem Grafikwechsel, Gebietswechsel und beim erneuten Betreten des Laufmodus erhalten. Ein Seitenneuladen setzt ihn zurück. Diese Bedienung simuliert Türen in der Browserkarte; sie verändert keine Türen auf dem Spielserver und synchronisiert sie nicht zwischen Browsern. Spielberechtigungen, Schlüssel und Originalgeräusche werden nicht simuliert.

Prüfung: `node --test tools/test-doors.cjs` kontrolliert die Aufteilung aller neun Modelle ohne Dreiecksverlust, feste Scharniere und Öffnungsrichtung bei verschiedenen Platzierungswinkeln, Sicht/Reichweite/Verdeckung, bewegte Kollisionen und wiederholten Aufbau ohne doppelte Drehung. Der Grafikladertest prüft außerdem die Freigabe der neuen Teilgeometrien.


## Live-Spieler während eines Kampfes

Der Tab **Live-Spieler** zeigt ein dunkles Gruppen-Dashboard mit Lebens-, Ausdauer- und Eitr-Balken, gehaltenen Gegenständen und einer Schaltfläche zur Spielerkarte. Bei höchstens 25 % aktuellem Leben wird die Karte als kritisch markiert. Namen bleiben an ihrer Position, auch wenn die Werte sich ändern. Filter, Kompaktmodus, Vollbild und „In eigenem Tab öffnen“ unterstützen einen zweiten Bildschirm. Die URL-Option `view=players` öffnet direkt die Gruppenübersicht; die normale Karten-URL und der gemeinsame Mitspielerraum bleiben erhalten.

Die Ansicht verbindet sich automatisch mit dem gemeinsamen Browserraum. Für Spieldaten muss eine laufende Mod-Verbindung vorhanden sein; Datenumfang und Sichtweite entsprechen dem jeweiligen Mod (ab 0.6.0 auch nahe Mitspieler). Reine Browserfiguren werden in dieser Kampfübersicht nicht als echte Spielcharaktere aufgeführt. Fehlende Werte erscheinen als „–“, nicht als volle Balken. Nach fünf Sekunden ohne neue Meldung sind Werte als veraltet markiert; spätestens nach zwanzig Sekunden werden die Vitalwerte ausgeblendet. Auch verschwundene Spieler bleiben sichtbar als offline. Diese Angaben beziehen sich auf lokal empfangene Meldungen, nicht auf fremde Rechneruhren.

Die Übersicht liest dieselben Live-Daten wie die Karte; ein offener Kampf-Tab benötigt keine laufende 3D-Darstellung. Die Teilen-Datei enthält ebenfalls das Dashboard. `tools/test-live-party.cjs` prüft Frische/Offlinezustände, kritische Werte, fehlende Werte, Nullwerte und die Speichergrenze.
