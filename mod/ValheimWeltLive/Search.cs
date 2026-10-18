// Kisten-Suche im Spiel: Fenster (Hotkey, Standard F7) – Item suchen, Kisten in der Nähe beschriften,
// Kisten weiter weg (aus der Live-Karte) als Pins auf der Karte, Rezept mit Zutaten-Bestand.
using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading;
using BepInEx.Configuration;
using HarmonyLib;
using UnityEngine;

namespace ValheimWeltLive
{
    public class WeltSuche : MonoBehaviour
    {
        public static WeltSuche Instance;
        public static bool Open;
        internal ConfigEntry<KeyboardShortcut> cfgKey;
        internal ConfigEntry<string> cfgUrl;
        internal ConfigEntry<int> cfgPins;
        internal BepInEx.Logging.ManualLogSource Log;

        // Kisten aus der Live-Karte (Stand der letzten Veröffentlichung)
        class RChest { public Vector3 p; public string label, type; public List<KeyValuePair<int, int>> items = new List<KeyValuePair<int, int>>(); public List<KeyValuePair<string, int>> named = new List<KeyValuePair<string, int>>(); }
        volatile List<RChest> remote; string remoteInfo = "", remoteWhen = ""; float nextFetch; volatile bool fetching;

        // Suche
        string query = "", lastQuery = null; Vector2 scroll; Rect win = new Rect(40, 120, 460, 560);
        class Hit { public int hash; public string name, token, prefab; public int total, inv; public List<ChestHit> chests = new List<ChestHit>(); public Recipe recipe; }
        class ChestHit { public Vector3 p; public string label; public int count; public bool live; }
        List<Hit> hits = new List<Hit>(); int selected = -1;
        readonly List<Minimap.PinData> pins = new List<Minimap.PinData>();
        internal static volatile string PendingQuery;   // von der Webseite (/api/find?q=…)
        bool focusField;

        void Update()
        {
            if (cfgKey.Value.IsDown()) { Open = !Open; if (Open) { focusField = true; lastQuery = null; } }
            if (PendingQuery != null) { query = PendingQuery; PendingQuery = null; Open = true; lastQuery = null; }
            if (Open && Input_GetEscape()) Open = false;
            if (!string.IsNullOrEmpty(cfgUrl.Value) && !fetching && Time.realtimeSinceStartup >= nextFetch && ZNet.instance != null) { nextFetch = Time.realtimeSinceStartup + 600f; FetchRemote(); }
            if (Open && query != lastQuery) { lastQuery = query; Search(); }
        }
        static bool Input_GetEscape() { try { return ZInput.GetKeyDown(KeyCode.Escape); } catch { return false; } }

        // ---------- Live-Karte laden (Hintergrund) ----------
        void FetchRemote()
        {
            fetching = true; string url = cfgUrl.Value.Trim();
            new Thread(() =>
            {
                try
                {
                    ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072; // TLS 1.2
                    var req = (HttpWebRequest)WebRequest.Create(url + (url.Contains("?") ? "&" : "?") + "_=" + DateTime.UtcNow.Ticks);
                    req.Timeout = 30000; req.UserAgent = "ValheimWeltLive";
                    byte[] raw; using (var res = req.GetResponse()) using (var s = res.GetResponseStream()) using (var ms = new MemoryStream()) { s.CopyTo(ms); raw = ms.ToArray(); }
                    string json;
                    if (raw.Length > 2 && raw[0] == 0x1f && raw[1] == 0x8b) using (var gz = new GZipStream(new MemoryStream(raw), CompressionMode.Decompress)) using (var sr = new StreamReader(gz, Encoding.UTF8)) json = sr.ReadToEnd();
                    else json = Encoding.UTF8.GetString(raw);
                    var root = MiniJson.Parse(json) as Dictionary<string, object>;
                    var list = new List<RChest>();
                    Action<object> addChest = (o) =>
                    {
                        var c = o as Dictionary<string, object>; if (c == null) return;
                        var rc = new RChest { p = new Vector3(F(c, "x"), F(c, "y"), F(c, "z")), label = c.ContainsKey("s") ? c["s"] as string : "", type = c.ContainsKey("t") ? c["t"] as string : "" };
                        var its = c.ContainsKey("i") ? c["i"] as List<object> : null;
                        if (its != null) foreach (var it in its) { var a = it as List<object>; if (a == null || a.Count < 2) continue; int n = Convert.ToInt32(a[1]); if (a.Count > 2 && a[2] != null) rc.items.Add(new KeyValuePair<int, int>(Convert.ToInt32(a[2]), n)); else rc.named.Add(new KeyValuePair<string, int>(Convert.ToString(a[0]), n)); }
                        list.Add(rc);
                    };
                    if (root != null)
                    {
                        if (root.ContainsKey("regions")) foreach (var r in (List<object>)root["regions"]) { var rd = r as Dictionary<string, object>; if (rd != null && rd.ContainsKey("chests")) foreach (var c in (List<object>)rd["chests"]) addChest(c); }
                        if (root.ContainsKey("looseChests") && root["looseChests"] is List<object>) foreach (var c in (List<object>)root["looseChests"]) addChest(c);
                        remoteWhen = root.ContainsKey("created") ? Convert.ToString(root["created"]) : "";
                    }
                    remote = list; remoteInfo = list.Count + " Kisten";
                    lastQuery = null;
                }
                catch (Exception e) { remoteInfo = "nicht erreichbar (" + e.Message + ")"; Log?.LogWarning("Live-Karte: " + e.Message); }
                finally { fetching = false; }
            }) { IsBackground = true }.Start();
        }
        static float F(Dictionary<string, object> d, string k) { return d.ContainsKey(k) ? Convert.ToSingle(d[k]) : 0f; }

        // ---------- Suche ----------
        // Localization liegt in einer anderen Spiel-DLL – per Reflection aufrufen
        static object locInst; static System.Reflection.MethodInfo locFn;
        internal static string L(string token)
        {
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
        void Search()
        {
            hits.Clear(); selected = -1; ClearPins();
            string q = (query ?? "").Trim().ToLowerInvariant(); if (q.Length < 2 || ObjectDB.instance == null) return;
            var player = Player.m_localPlayer;
            foreach (var go in ObjectDB.instance.m_items)
            {
                if (go == null) continue; var id = go.GetComponent<ItemDrop>(); if (id == null) continue;
                string token = id.m_itemData.m_shared.m_name, name = L(token);
                if (string.IsNullOrEmpty(name) || name.StartsWith("$") || !(name.ToLowerInvariant().Contains(q) || go.name.ToLowerInvariant().Contains(q))) continue;
                hits.Add(new Hit { hash = Plugin.StableHash(go.name), name = name, token = token, prefab = go.name });
                if (hits.Count > 40) break;
            }
            // Bestand: Kisten in der Nähe (echter Inhalt) + Live-Karte (übrige Kisten)
            Snapshot(); countCache.Clear();
            foreach (var h in hits)
            {
                foreach (var c in near) { int n; if (c.items.TryGetValue(h.prefab, out n) && n > 0) h.chests.Add(new ChestHit { p = c.p, label = c.label, count = n, live = true }); }
                var rem = remote;
                if (rem != null) foreach (var rc in rem)
                {
                    if (h.chests.Any((x) => x.live && (x.p - rc.p).sqrMagnitude < 1.5f)) continue; // in der Nähe schon live gezählt
                    int n = 0; foreach (var kv in rc.items) if (kv.Key == h.hash) n += kv.Value;
                    foreach (var kv in rc.named) if (StripQ(kv.Key).Equals(h.name, StringComparison.OrdinalIgnoreCase)) n += kv.Value;
                    if (n > 0) h.chests.Add(new ChestHit { p = rc.p, label = string.IsNullOrEmpty(rc.label) ? rc.type : rc.label, count = n });
                }
                h.total = h.chests.Sum((x) => x.count);
                try { if (player != null) h.inv = player.GetInventory().CountItems(h.token); } catch { }
                try { h.recipe = ObjectDB.instance.m_recipes.FirstOrDefault((r) => r != null && r.m_item != null && r.m_item.gameObject.name == h.prefab && r.m_enabled); } catch { }
                if (player != null) h.chests.Sort((a, b) => (a.p - player.transform.position).sqrMagnitude.CompareTo((b.p - player.transform.position).sqrMagnitude));
            }
            hits = hits.OrderByDescending((h) => h.name.Equals(query.Trim(), StringComparison.OrdinalIgnoreCase)).ThenByDescending((h) => h.total + h.inv > 0).ThenBy((h) => h.name.Length).ToList();
            if (hits.Count > 0) Select(0);
        }
        static string StripQ(string s) { int i = s.IndexOf(" ★", StringComparison.Ordinal); return i > 0 ? s.Substring(0, i) : s; }
        // Kisten in der Nähe einmal je Suche erfassen (Inhalt + Schild)
        class NearChest { public Vector3 p; public string label; public Dictionary<string, int> items = new Dictionary<string, int>(); }
        List<NearChest> near = new List<NearChest>();
        readonly Dictionary<string, int> countCache = new Dictionary<string, int>();
        void Snapshot()
        {
            near.Clear(); Container[] cs; Sign[] signs;
            try { cs = UnityEngine.Object.FindObjectsOfType<Container>(); signs = UnityEngine.Object.FindObjectsOfType<Sign>(); } catch { return; }
            foreach (var c in cs)
            {
                if (c == null) continue; Inventory inv = null; try { inv = c.GetInventory(); } catch { } if (inv == null) continue;
                var nc = new NearChest { p = c.transform.position, label = L(c.m_name) };
                foreach (var sg in signs) if (sg != null && (sg.transform.position - nc.p).sqrMagnitude < 4.84f) { try { nc.label = sg.GetText(); } catch { } break; }
                foreach (var it in inv.GetAllItems()) if (it != null && it.m_dropPrefab != null) { int n; nc.items.TryGetValue(it.m_dropPrefab.name, out n); nc.items[it.m_dropPrefab.name] = n + it.m_stack; }
                near.Add(nc);
            }
        }
        int CountAll(string prefab, string token)
        {
            int n; if (countCache.TryGetValue(prefab, out n)) return n;
            n = 0; int hash = Plugin.StableHash(prefab); string name = L(token);
            foreach (var c in near) { int k; if (c.items.TryGetValue(prefab, out k)) n += k; }
            var rem = remote; if (rem != null) foreach (var rc in rem) { if (near.Any((c) => (c.p - rc.p).sqrMagnitude < 1.5f)) continue; foreach (var kv in rc.items) if (kv.Key == hash) n += kv.Value; foreach (var kv in rc.named) if (StripQ(kv.Key).Equals(name, StringComparison.OrdinalIgnoreCase)) n += kv.Value; }
            try { if (Player.m_localPlayer != null) n += Player.m_localPlayer.GetInventory().CountItems(token); } catch { }
            countCache[prefab] = n; return n;
        }
        void Select(int i)
        {
            selected = i; ClearPins(); if (i < 0 || i >= hits.Count || Minimap.instance == null) return;
            var h = hits[i]; int max = Math.Max(1, cfgPins.Value);
            foreach (var c in h.chests.Take(max)) try { var pd = AddPin(c.p, h.name + " ×" + c.count); if (pd != null) pins.Add(pd); } catch (Exception e) { Log?.LogDebug(e); }
        }
        // Minimap.AddPin hat je nach Spielversion weitere optionale Parameter – per Reflection mit Standardwerten aufrufen
        static System.Reflection.MethodInfo addPinFn;
        static Minimap.PinData AddPin(Vector3 pos, string label)
        {
            if (addPinFn == null) addPinFn = typeof(Minimap).GetMethods().FirstOrDefault((m) => m.Name == "AddPin" && m.GetParameters().Length >= 5 && m.GetParameters()[0].ParameterType == typeof(Vector3));
            if (addPinFn == null) return null;
            var ps = addPinFn.GetParameters(); var args = new object[ps.Length];
            for (int i = 0; i < ps.Length; i++)
            {
                if (i == 0) args[i] = pos; else if (i == 1) args[i] = Minimap.PinType.Icon3; else if (i == 2) args[i] = label; else if (i == 3 || i == 4) args[i] = false;
                else args[i] = ps[i].HasDefaultValue ? ps[i].DefaultValue : (ps[i].ParameterType.IsValueType ? Activator.CreateInstance(ps[i].ParameterType) : null);
                if (args[i] == null && ps[i].ParameterType.IsValueType) args[i] = Activator.CreateInstance(ps[i].ParameterType);
            }
            return addPinFn.Invoke(Minimap.instance, args) as Minimap.PinData;
        }
        void ClearPins() { if (Minimap.instance != null) foreach (var p in pins) try { Minimap.instance.RemovePin(p); } catch { } pins.Clear(); }
        void OnDestroy() { ClearPins(); }

        // ---------- Fenster ----------
        void OnGUI()
        {
            if (!Open || Player.m_localPlayer == null) return;
            // Beschriftung der Kisten in der Nähe
            if (selected >= 0 && selected < hits.Count && Camera.main != null)
            {
                var h = hits[selected];
                foreach (var c in h.chests)
                {
                    if ((c.p - Player.m_localPlayer.transform.position).sqrMagnitude > 60f * 60f) continue;
                    var sp = Camera.main.WorldToScreenPoint(c.p + Vector3.up * 1.2f); if (sp.z <= 0) continue;
                    var r = new Rect(sp.x - 90, Screen.height - sp.y - 12, 180, 24);
                    GUI.Box(r, ""); GUI.Label(new Rect(r.x + 8, r.y + 3, r.width - 10, 20), h.name + " ×" + c.count);
                }
            }
            win = GUILayout.Window(0x57454c54, win, DrawWindow, "Kisten-Suche (" + cfgKey.Value + " schließt)");
        }
        void DrawWindow(int id)
        {
            GUILayout.BeginHorizontal();
            GUI.SetNextControlName("vwq");
            query = GUILayout.TextField(query ?? "", GUILayout.ExpandWidth(true));
            if (GUILayout.Button("X", GUILayout.Width(28))) query = "";
            GUILayout.EndHorizontal();
            if (focusField) { GUI.FocusControl("vwq"); focusField = false; }
            scroll = GUILayout.BeginScrollView(scroll, GUILayout.ExpandWidth(true));
            if ((query ?? "").Trim().Length < 2) GUILayout.Label("Item-Namen eingeben, z. B. Eisen, Kernholz, Met …");
            else if (hits.Count == 0) GUILayout.Label("Kein passendes Item gefunden.");
            for (int i = 0; i < hits.Count && i < 25; i++)
            {
                var h = hits[i];
                if (GUILayout.Button((i == selected ? "> " : "") + h.name + "   –   " + h.total + " in " + h.chests.Count + " Kiste(n)" + (h.inv > 0 ? " · " + h.inv + " im Inventar" : ""))) Select(i);
                if (i != selected) continue;
                var me = Player.m_localPlayer.transform.position;
                foreach (var c in h.chests.Take(12)) GUILayout.Label("    " + c.count + " ×  " + (string.IsNullOrEmpty(c.label) ? "Kiste" : c.label) + "  ·  " + Mathf.RoundToInt(Vector3.Distance(me, c.p)) + " m" + (c.live ? "" : "  (Live-Karte)"));
                if (h.chests.Count > 12) GUILayout.Label("    … " + (h.chests.Count - 12) + " weitere (alle als Pins auf der Karte)");
                if (h.recipe != null)
                {
                    var st = h.recipe.m_craftingStation != null ? L(h.recipe.m_craftingStation.m_name) : "ohne Werkbank";
                    GUILayout.Label("  Rezept (" + st + (h.recipe.m_amount > 1 ? ", ergibt " + h.recipe.m_amount : "") + "):");
                    foreach (var rq in h.recipe.m_resources)
                    {
                        if (rq == null || rq.m_resItem == null || rq.m_amount <= 0) continue;
                        if (rq.m_resItem.gameObject.name.StartsWith("Upgrader")) continue; // Götzen = optionale Verstärkung, keine Pflicht-Zutat
                        string tok = rq.m_resItem.m_itemData.m_shared.m_name; int have = CountAll(rq.m_resItem.gameObject.name, tok);
                        GUILayout.BeginHorizontal();
                        GUILayout.Label("    " + (have >= rq.m_amount ? "[ok]  " : "[fehlt]  ") + rq.m_amount + " × " + L(tok) + "   (" + have + " da)");
                        if (GUILayout.Button("suchen", GUILayout.Width(70))) { query = L(tok); }
                        GUILayout.EndHorizontal();
                    }
                }
            }
            GUILayout.EndScrollView();
            GUILayout.Label(string.IsNullOrEmpty(cfgUrl.Value) ? "Nur Kisten in der Nähe. Für alle Kisten: LiveMapUrl in der Mod-Konfiguration eintragen." : "Live-Karte: " + (fetching && remote == null ? "lädt …" : remoteInfo) + (remoteWhen.Length >= 16 ? " · Stand " + remoteWhen.Substring(0, 16).Replace('T', ' ') + " UTC" : ""));
            GUI.DragWindow();
        }
    }

    // Spielsteuerung blockieren, solange das Fenster offen ist (Tippen soll den Wikinger nicht bewegen)
    static class SuchePatches
    {
        public static void Apply(Harmony h, BepInEx.Logging.ManualLogSource log)
        {
            TryPatch(h, log, typeof(PlayerController), "TakeInput", nameof(BlockInput));
            TryPatch(h, log, typeof(GameCamera), "UpdateMouseCapture", nameof(FreeMouse));
        }
        static void TryPatch(Harmony h, BepInEx.Logging.ManualLogSource log, Type t, string m, string post)
        {
            try { var mi = AccessTools.Method(t, m); if (mi == null) { log.LogWarning("Suche: " + t.Name + "." + m + " nicht gefunden"); return; } h.Patch(mi, postfix: new HarmonyMethod(typeof(SuchePatches), post)); }
            catch (Exception e) { log.LogWarning("Suche: Patch " + m + ": " + e.Message); }
        }
        static void BlockInput(ref bool __result) { if (WeltSuche.Open) __result = false; }
        static void FreeMouse() { if (WeltSuche.Open) { Cursor.lockState = CursorLockMode.None; Cursor.visible = true; } }
    }

    // Minimaler JSON-Leser (Objekte → Dictionary, Arrays → List, Zahlen → double)
    static class MiniJson
    {
        public static object Parse(string s) { int i = 0; return Val(s, ref i); }
        static void Ws(string s, ref int i) { while (i < s.Length && char.IsWhiteSpace(s[i])) i++; }
        static object Val(string s, ref int i)
        {
            Ws(s, ref i); if (i >= s.Length) return null; char c = s[i];
            if (c == '{') { i++; var d = new Dictionary<string, object>(); Ws(s, ref i); if (s[i] == '}') { i++; return d; } while (true) { Ws(s, ref i); var k = Str(s, ref i); Ws(s, ref i); i++; d[k] = Val(s, ref i); Ws(s, ref i); if (s[i] == ',') { i++; continue; } i++; return d; } }
            if (c == '[') { i++; var l = new List<object>(); Ws(s, ref i); if (s[i] == ']') { i++; return l; } while (true) { l.Add(Val(s, ref i)); Ws(s, ref i); if (s[i] == ',') { i++; continue; } i++; return l; } }
            if (c == '"') return Str(s, ref i);
            if (s.Length - i >= 4 && s.Substring(i, 4) == "true") { i += 4; return true; }
            if (s.Length - i >= 5 && s.Substring(i, 5) == "false") { i += 5; return false; }
            if (s.Length - i >= 4 && s.Substring(i, 4) == "null") { i += 4; return null; }
            int st = i; while (i < s.Length && "+-0123456789.eE".IndexOf(s[i]) >= 0) i++;
            return double.Parse(s.Substring(st, i - st), System.Globalization.CultureInfo.InvariantCulture);
        }
        static string Str(string s, ref int i)
        {
            var sb = new StringBuilder(); i++;
            while (i < s.Length && s[i] != '"')
            {
                if (s[i] == '\\')
                {
                    i++; char e = s[i];
                    if (e == 'n') sb.Append('\n'); else if (e == 't') sb.Append('\t'); else if (e == 'r') sb.Append('\r'); else if (e == 'b') sb.Append('\b'); else if (e == 'f') sb.Append('\f');
                    else if (e == 'u') { sb.Append((char)Convert.ToInt32(s.Substring(i + 1, 4), 16)); i += 4; }
                    else sb.Append(e);
                    i++;
                }
                else sb.Append(s[i++]);
            }
            i++; return sb.ToString();
        }
    }
}
