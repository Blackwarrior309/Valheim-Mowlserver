# Waffen und Fahrzeuge im Browser

In der 3D-Ansicht öffnet **Waffen / Fahrzeuge (B)** das Menü und startet bei Bedarf den Laufmodus. Es gibt AK (Dauerfeuer), Sniper (rechte Maustaste zum Zielen), Raketenwerfer sowie einen Panzer mit Kanone und einen Jet. Mausrad wechselt zwischen erster und dritter Person. Die Waffenwahl schließt das Menü. Linke Maustaste halten, X halten oder den sichtbaren Feuerknopf halten feuert; B gibt die Maus für das Menü frei. Mündungsblitz, Einschlag und Schusszähler zeigen die ausgelösten Schüsse. Maus-Eingaben werden auch bei Pointer Lock als Mausereignisse verarbeitet; Touch/Stift nutzen Pointer-Ereignisse. Loslassen, Fokusverlust, verborgener Tab und verlorene Mausbindung beenden Dauerfeuer.

- Panzer: W/S vorwärts/rückwärts, A/D lenken, Maus zielen, E aussteigen.
- Jet: W/S Schub, A/D Kurve, Pfeil hoch/runter Höhenruder, Q/R rollen, E aussteigen. Der Jet wird auf freier Fläche in der Luft gestartet; bei geringer Geschwindigkeit sinkt er.
- Spawnen steigt direkt ein. Pro Besucher gibt es ein aktives Fahrzeug; Aussteigen entfernt es. Andere Browser-Spieler sehen das Fahrzeug über die bestehende gemeinsame MQTT-Präsenz.
- Spieler erhalten 100 Browser-Lebenspunkte. Nach einem Abschuss erscheinen sie nach vier Sekunden am Spawn wieder. Im Menü kann jeder die Teilnahme an Browser-Gefechten ausschalten. Friedliche Spieler verursachen und erhalten keinen PvP-Schaden.
- AK/Sniper prüfen die Schusslinie gegen Bauteile und Gelände. Raketen und Kanonen verursachen zeitverzögerten Flächenschaden und nutzen den vorhandenen lokalen Abriss-Spielplatz. Die Trümmer bleiben wie bisher pro Browser lokal.

Diese Spielzeuge ändern keine Valheim-Spielstände oder Mod-Charaktere. Fahrzeuge und Waffen sind einfache prozedurale Modelle; die Steuerung ist Arcade-Physik mit Gelände-/Hindernisprüfung. Kein realistischer Flug- oder Kettensimulator. Fahrzeuge kämpfen über die Lebenspunkte ihres Fahrers. Der vorhandene öffentliche MQTT-Transport hat keine verbindliche Server-Autorität: Der Empfänger prüft bekannte Browser-Absender, Herkunft, Reichweite, Sequenz und Feuerrate und verwaltet seine eigenen Lebenspunkte. Das ist ein Spielplatz für die Gruppe, kein manipulationssicheres Wettkampfspiel.

## Prüfung

`node --test tools/test-browser-playground.cjs tools/test-multiplayer.cjs`

Die Tests prüfen Pakete, Feuerrate, Treffer, Wiederholungen, Mod-/Friedlich-Ausschluss, Tod/Wiedererscheinen, echte Fahrzeugbewegung und Ressourcenfreigabe. Zusätzlich wurden zwei Browser-Sitzungen mit dem gemeinsamen MQTT-Raum und echte Snipertreffer sowie Panzerfahrt und Jetflug geprüft.
