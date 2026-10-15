// Nur zum Kompilieren (Referenz-Stub): Signaturen wie in UnityEngine.IMGUIModule (Unity 2022).
// Wird NICHT ausgeliefert – im Spiel nimmt Unity seine echte UnityEngine.IMGUIModule.dll.
// Bauen: mcs -target:library -nostdlib -noconfig -out:UnityEngine.IMGUIModule.dll -r:mscorlib.dll -r:UnityEngine.CoreModule.dll UnityEngine.IMGUIModule.cs
using System;
namespace UnityEngine
{
    public sealed class GUILayoutOption { internal GUILayoutOption() { } }
    public class GUIStyle { public GUIStyle() { } public bool wordWrap { get { return false; } set { } } public bool richText { get { return false; } set { } } public int fontSize { get { return 0; } set { } } }
    public class GUISkin { public GUIStyle label { get { return null; } set { } } public GUIStyle button { get { return null; } set { } } }
    public class GUI
    {
        public delegate void WindowFunction(int id);
        public static Color color { get { return default(Color); } set { } }
        public static GUISkin skin { get { return null; } set { } }
        public static void DragWindow() { }
        public static void Label(Rect position, string text) { }
        public static void Label(Rect position, string text, GUIStyle style) { }
        public static void Box(Rect position, string text) { }
        public static void SetNextControlName(string name) { }
        public static void FocusControl(string name) { }
        public static void FocusWindow(int windowID) { }
    }
    public class GUILayout
    {
        public static Rect Window(int id, Rect screenRect, GUI.WindowFunction func, string text, params GUILayoutOption[] options) { return screenRect; }
        public static string TextField(string text, params GUILayoutOption[] options) { return text; }
        public static void Label(string text, params GUILayoutOption[] options) { }
        public static void Label(string text, GUIStyle style, params GUILayoutOption[] options) { }
        public static bool Button(string text, params GUILayoutOption[] options) { return false; }
        public static bool Toggle(bool value, string text, params GUILayoutOption[] options) { return value; }
        public static void BeginHorizontal(params GUILayoutOption[] options) { }
        public static void EndHorizontal() { }
        public static void BeginVertical(params GUILayoutOption[] options) { }
        public static void EndVertical() { }
        public static Vector2 BeginScrollView(Vector2 scrollPosition, params GUILayoutOption[] options) { return scrollPosition; }
        public static void EndScrollView() { }
        public static void Space(float pixels) { }
        public static void FlexibleSpace() { }
        public static GUILayoutOption Width(float width) { return null; }
        public static GUILayoutOption Height(float height) { return null; }
        public static GUILayoutOption ExpandWidth(bool expand) { return null; }
    }
}
