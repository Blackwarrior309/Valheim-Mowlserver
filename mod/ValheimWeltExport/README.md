# Bauteil-Export (Hilfs-Mod)

Schreibt beim Laden einer Welt einmal alle baubaren Teile des Spiels nach
`BepInEx/config/ValheimWeltLive/bauteile.json`: Prefab-Name, Name/Beschreibung in der Spielsprache,
Kategorie, Werkbank, Kosten, Material, Maße (Modell-Box und Einrastpunkte). Daraus entstehen
`tools/piece_specs.py` und `tools/piece_names_de.json`. Nichts wird gebaut oder verändert.

Bauen (Mono): `mcs -target:library -nostdlib -out:ValheimWeltExport.dll -r:<Managed>/mscorlib.dll -r:<Managed>/System.dll -r:<Managed>/System.Core.dll -r:<Managed>/netstandard.dll -r:<Managed>/UnityEngine.dll -r:<Managed>/UnityEngine.CoreModule.dll -r:<Managed>/assembly_valheim.dll -r:<Managed>/assembly_utils.dll -r:<BepInEx>/core/BepInEx.dll Export.cs`
