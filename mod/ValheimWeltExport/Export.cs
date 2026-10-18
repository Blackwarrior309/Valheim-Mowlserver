// Valheim Welt – Bauteil-Export (inoffiziell, BepInEx)
// Schreibt beim Laden einer Welt einmal alle baubaren Teile des Spiels in eine Datei:
//   BepInEx/config/ValheimWeltLive/bauteile.json
// Pro Bauteil: Prefab-Name, Name und Beschreibung in der Spielsprache, Kategorie, Werkbank,
// Baukosten, Material (Holz/Stein/…), Maße aus den Modellen und den Einrastpunkten.
// Es wird nichts platziert und nichts an der Welt verändert. Nicht von Iron Gate.
using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using BepInEx;
using UnityEngine;

namespace ValheimWeltExport
{
    [BepInPlugin("de.valheimweltviewer.export", "Valheim Welt Bauteil-Export", "1.1.0")]
    public class Export : BaseUnityPlugin
    {
        bool done;

        void Update()
        {
            if (done || ZNetScene.instance == null || ObjectDB.instance == null || Player.m_localPlayer == null) return;
            done = true;
            StartCoroutine(Run());
        }

        IEnumerator Run()
        {
            yield return new WaitForSeconds(3f); // Lokalisierung und Prefabs sicher geladen
            try { Write(); }
            catch (Exception e) { Logger.LogError("Bauteil-Export fehlgeschlagen: " + e); }
            try { WriteWorldGen(); }
            catch (Exception e) { Logger.LogError("Weltgenerator-Export fehlgeschlagen: " + e); }
        }

        static readonly CultureInfo IC = CultureInfo.InvariantCulture;
        static string F(float v) => Math.Round(v, 3).ToString(IC);
        static string J(string s)
        {
            if (s == null) return "null";
            var b = new StringBuilder("\"");
            foreach (char c in s)
            {
                if (c == '"' || c == '\\') b.Append('\\').Append(c);
                else if (c < 32) b.Append("\\u").Append(((int)c).ToString("x4"));
                else b.Append(c);
            }
            return b.Append('"').ToString();
        }

        // Localization liegt in einer anderen Spiel-DLL – per Reflection
        static object locInst; static System.Reflection.MethodInfo locFn;
        static string L(string token)
        {
            if (string.IsNullOrEmpty(token)) return token;
            try
            {
                if (locFn == null)
                {
                    var t = AppDomain.CurrentDomain.GetAssemblies().Select((a) => { try { return a.GetType("Localization"); } catch { return null; } }).FirstOrDefault((x) => x != null);
                    if (t == null) return token;
                    var pi = t.GetProperty("instance", System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Static);
                    locInst = pi != null ? pi.GetValue(null, null) : t.GetField("instance", System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static)?.GetValue(null);
                    locFn = t.GetMethod("Localize", new[] { typeof(string) });
                }
                return locInst != null && locFn != null ? (string)locFn.Invoke(locInst, new object[] { token }) : token;
            }
            catch { return token; }
        }

        static object Field(object o, string name)
        {
            if (o == null) return null;
            var f = o.GetType().GetField(name, System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            return f?.GetValue(o);
        }

        // Umhüllende Box der sichtbaren Modelle im Koordinatensystem des Prefabs (nur LOD 0)
        static bool MeshBounds(GameObject p, out Bounds b)
        {
            b = new Bounds(); bool any = false;
            var toLocal = p.transform.worldToLocalMatrix;
            HashSet<Renderer> lod0 = null; var lods = new HashSet<Renderer>();
            foreach (var lg in p.GetComponentsInChildren<LODGroup>(true))
            {
                var ls = lg.GetLODs();
                for (int i = 0; i < ls.Length; i++) foreach (var r in ls[i].renderers) if (r != null) { if (i == 0) (lod0 ?? (lod0 = new HashSet<Renderer>())).Add(r); else lods.Add(r); }
            }
            foreach (var mf in p.GetComponentsInChildren<MeshFilter>(true))
            {
                var r = mf.GetComponent<Renderer>(); if (r == null) continue;
                if (lods.Contains(r) && (lod0 == null || !lod0.Contains(r))) continue;
                var n = mf.gameObject.name.ToLowerInvariant();
                if (n.Contains("collider") || n.Contains("ghost") || n.Contains("_snap")) continue;
                Add(mf.sharedMesh, mf.transform, toLocal, ref b, ref any);
            }
            foreach (var sr in p.GetComponentsInChildren<SkinnedMeshRenderer>(true))
            {
                if (lods.Contains(sr) && (lod0 == null || !lod0.Contains(sr))) continue;
                Add(sr.sharedMesh, sr.transform, toLocal, ref b, ref any);
            }
            return any;
        }

        static void Add(Mesh m, Transform t, Matrix4x4 toLocal, ref Bounds b, ref bool any)
        {
            if (m == null) return;
            var mb = m.bounds; var mat = toLocal * t.localToWorldMatrix;
            for (int i = 0; i < 8; i++)
            {
                var c = mb.center + Vector3.Scale(mb.extents, new Vector3((i & 1) == 0 ? -1 : 1, (i & 2) == 0 ? -1 : 1, (i & 4) == 0 ? -1 : 1));
                var w = mat.MultiplyPoint3x4(c);
                if (!any) { b = new Bounds(w, Vector3.zero); any = true; } else b.Encapsulate(w);
            }
        }

        static bool SnapBounds(GameObject p, out Bounds b, out int count)
        {
            b = new Bounds(); count = 0;
            var toLocal = p.transform.worldToLocalMatrix;
            foreach (Transform t in p.GetComponentsInChildren<Transform>(true))
            {
                if (t.gameObject.name != "_snappoint") continue;
                var w = toLocal.MultiplyPoint3x4(t.position);
                if (count++ == 0) b = new Bounds(w, Vector3.zero); else b.Encapsulate(w);
            }
            return count > 0;
        }

        static string V(Vector3 v) => "[" + F(v.x) + "," + F(v.y) + "," + F(v.z) + "]";

        // Messwerte des Weltgenerators, damit die Webseite die Karte aus dem Seed exakt nachrechnen kann
        void WriteWorldGen()
        {
            var wg = WorldGenerator.instance; if (wg == null) return;
            var sb = new StringBuilder("{\"format\":\"vw-worldgen\",\"version\":1");
            var world = Field(wg, "m_world");
            sb.Append(",\"seedName\":").Append(J(Field(world, "m_seedName") as string)).Append(",\"seed\":").Append(Field(world, "m_seed"));
            sb.Append(",\"worldGenVersion\":").Append(Field(world, "m_worldGenVersion"));
            sb.Append(",\"offsets\":[");
            for (int i = 0; i <= 4; i++) { if (i > 0) sb.Append(','); sb.Append(F((float)Field(wg, "m_offset" + i))); }
            sb.Append("],\"riverSeed\":").Append(Field(wg, "m_riverSeed")).Append(",\"streamSeed\":").Append(Field(wg, "m_streamSeed"));
            // Zufallsgenerator von Unity: erste Werte nach InitState(12345)
            var st = UnityEngine.Random.state; UnityEngine.Random.InitState(12345);
            sb.Append(",\"rng12345\":["); for (int i = 0; i < 8; i++) { if (i > 0) sb.Append(','); sb.Append(UnityEngine.Random.Range(-10000, 10000)); } sb.Append(']');
            UnityEngine.Random.state = st;
            // Mathf.PerlinNoise an festen Stellen
            sb.Append(",\"perlin\":[");
            var rnd = new System.Random(7); int k = 0;
            for (int i = 0; i < 300; i++)
            {
                float x = (float)(rnd.NextDouble() * 400 - 200), y = (float)(rnd.NextDouble() * 400 - 200);
                if (i < 20) { x = i * 0.37f; y = i * 0.11f; }
                if (k++ > 0) sb.Append(',');
                sb.Append('[').Append(F(x)).Append(',').Append(F(y)).Append(',').Append(Mathf.PerlinNoise(x, y).ToString("R", IC)).Append(']');
            }
            sb.Append("],\"samples\":[");
            // Biom und Grundhöhe auf einem Raster über die ganze Welt
            var baseH = typeof(WorldGenerator).GetMethod("GetBaseHeight", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic, null, new[] { typeof(float), typeof(float), typeof(bool) }, null);
            k = 0;
            for (int gz = -10400; gz <= 10400; gz += 400) for (int gx = -10400; gx <= 10400; gx += 400)
            {
                var b = (int)wg.GetBiome((float)gx, (float)gz, 0.02f, false);
                var h = (float)baseH.Invoke(wg, new object[] { (float)gx, (float)gz, false });
                if (k++ > 0) sb.Append(',');
                sb.Append('[').Append(gx).Append(',').Append(gz).Append(',').Append(b).Append(',').Append(h.ToString("R", IC)).Append(']');
            }
            sb.Append("]}\n");
            var dir = Path.Combine(Paths.ConfigPath, "ValheimWeltLive"); Directory.CreateDirectory(dir);
            File.WriteAllText(Path.Combine(dir, "weltgenerator.json"), sb.ToString(), new UTF8Encoding(false));
            Logger.LogInfo("Weltgenerator-Messwerte gespeichert");
        }

        void Write()
        {
            var sb = new StringBuilder();
            sb.Append("{\"format\":\"vw-bauteile\",\"version\":1,\"game\":").Append(J(Application.version)).Append(",\"created\":").Append(J(DateTime.UtcNow.ToString("o")))
              .Append(",\"language\":").Append(J(L("$language_name") == "$language_name" ? "" : L("$language_name"))).Append(",\"pieces\":[\n");
            int n = 0;
            foreach (var go in ZNetScene.instance.m_prefabs)
            {
                if (go == null) continue;
                var piece = go.GetComponent<Piece>(); if (piece == null) continue;
                if (n++ > 0) sb.Append(",\n");
                sb.Append("{\"prefab\":").Append(J(go.name));
                sb.Append(",\"token\":").Append(J(piece.m_name)).Append(",\"name\":").Append(J(L(piece.m_name)));
                sb.Append(",\"desc\":").Append(J(L(piece.m_description)));
                sb.Append(",\"category\":").Append(J(Field(piece, "m_category")?.ToString()));
                var st = Field(piece, "m_craftingStation") as Component;
                sb.Append(",\"station\":").Append(st != null ? J(L((string)Field(st, "m_name"))) : "null");
                var wnt = go.GetComponent<WearNTear>();
                sb.Append(",\"material\":").Append(wnt != null ? J(Field(wnt, "m_materialType")?.ToString()) : "null");
                sb.Append(",\"comfort\":").Append(Field(piece, "m_comfort") is int cf ? cf.ToString(IC) : "0");
                sb.Append(",\"cost\":[");
                if (Field(piece, "m_resources") is Array res)
                {
                    int k = 0;
                    foreach (var r in res)
                    {
                        var item = Field(r, "m_resItem") as ItemDrop; if (item == null) continue;
                        if (k++ > 0) sb.Append(',');
                        sb.Append("[").Append(J(item.gameObject.name)).Append(',').Append(J(L(item.m_itemData.m_shared.m_name))).Append(',').Append(Field(r, "m_amount") is int am ? am.ToString(IC) : "0").Append("]");
                    }
                }
                sb.Append("]");
                if (MeshBounds(go, out var mb)) sb.Append(",\"size\":").Append(V(mb.size)).Append(",\"center\":").Append(V(mb.center));
                if (SnapBounds(go, out var sbx, out int sc)) sb.Append(",\"snapSize\":").Append(V(sbx.size)).Append(",\"snapCenter\":").Append(V(sbx.center)).Append(",\"snaps\":").Append(sc);
                sb.Append("}");
            }
            sb.Append("\n]}\n");
            var dir = Path.Combine(Paths.ConfigPath, "ValheimWeltLive"); Directory.CreateDirectory(dir);
            var path = Path.Combine(dir, "bauteile.json");
            File.WriteAllText(path, sb.ToString(), new UTF8Encoding(false));
            Logger.LogInfo("Bauteil-Export: " + n + " Bauteile → " + path);
            try { MessageHud.instance?.ShowMessage(MessageHud.MessageType.Center, "Bauteil-Export: " + n + " Bauteile gespeichert"); } catch { }
        }
    }
}
