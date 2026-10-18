# Valheim Original

Unter **3D → Grafik → Valheim Original** zeigt die Karte exportierte Valheim-Modelle
mit ihren Original-UVs und Farbtexturen. Die bisherigen Grafikstile bleiben verfügbar.
Die Auswahl wird wie die anderen Grafikeinstellungen im Browser gespeichert.

Das öffentliche Paket liegt in `assets/valheim/`. Besucher brauchen keine lokale
Spielinstallation. Der Browser lädt nur benötigte Objekttypen (maximal vier gleichzeitig)
und verwendet Instancing für wiederholte Bauteile. Fehlende oder defekte Modelle erhalten
automatisch die vereinfachte Ersatzgrafik; die Statuszeile zeigt die Typ-Abdeckung.

## Paket erneuern

Python 3.12 oder neuer mit den Export-Abhängigkeiten:

```powershell
python -m pip install -r tools/requirements-graphics.txt
python tools/export_graphics.py --game "F:/SteamLibrary/steamapps/common/Valheim"
```

Der Export liest die Installation, verändert sie aber nicht. `index.json` enthält
Prefab-Namen und versionierte Modellpfade. Jedes Modell enthält indizierte Geometrie,
UVs, Normalen und Materialgruppen; Texturen werden gemeinsam als WebP gespeichert.
`export-report.json` dokumentiert fehlende Objekte und Exportfehler.

Nach einem Spielupdate das Paket erneut exportieren und `assets/valheim/` zusammen
mit dem Viewer veröffentlichen. GitHub Pages nimmt diesen Ordner automatisch mit.
Die Server-Pipeline braucht keine Valheim-Installation für das Ausliefern der Grafik.

## Daten und Grenzen

Neue `.vwelt`-Snapshots enthalten zusätzlich `Region.natureModels`:
`{ "PrefabName": { "kind": "tree_beech", "instances": [x,y,z,gierGrad,scale,...] } }`.
Die vorhandenen Naturdaten bleiben für ältere Viewer bestehen. Alte Snapshots ohne
Prefab-Zuordnung nutzen für Vegetation die bisherige Grafik; die nächste Umwandlung
der Welt ergänzt die Namen automatisch. Gebäudemodelle funktionieren auch mit alten Snapshots.

Die Darstellung verwendet statische Modelle bzw. die Ruhepose animierter Modelle,
die aktive unbeschädigte Prefab-Variante und den ersten LOD. Unity-Spezialshader,
Wind, Partikel, Animationen, Türzustände und Schäden werden nicht nachgebildet.
Weltposition und Gierwinkel stammen aus dem bestehenden Weltformat; vollständige
Objektrotationen sind darin bisher nicht enthalten. Das Gelände bleibt rekonstruiert.

Eine heruntergeladene Teilen-HTML enthält kein Originalpaket und fällt auf Natur-Grafik zurück.
Die Original-Spieldaten sind Eigentum von Iron Gate und fallen nicht unter die Lizenz
des Viewer-Quellcodes.
