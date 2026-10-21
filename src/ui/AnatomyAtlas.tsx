import React, { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, TextInput, View, useWindowDimensions } from "react-native";
import { Activity, ArrowUpRight, Bone, Eye, Focus, Heart, Layers3, Maximize2, Minus, Network, Plus, RotateCcw, Search, Sparkles, Zap } from "lucide-react-native";
import { anatomyStructure, anatomyStructures, anatomySystem, anatomySystems, type AnatomySystem, type AnatomyView } from "../data/anatomy-structures";
import { muscleAttachments } from "../data/muscle-attachments";
import type { AnatomyFocus } from "../domain/types";
import { useI18n } from "../i18n";
import { Button, Card, Chip, Title, Txt, wrap } from "./components";
import { useTheme } from "./theme";
import { HumanFigure } from "./anatomy-vector";
import { AnatomyScene } from "./AnatomyScene";
const icons = { muscles: Activity, nerves: Zap, skeleton: Bone, organs: Heart, vessels: Network };
const focusLabels = {
  origin: { fr: "Origines", en: "Origins" },
  insertion: { fr: "Insertions", en: "Insertions" },
  action: { fr: "Actions", en: "Actions" },
  innervation: { fr: "Innervation", en: "Innervation" },
};
export function AnatomyAtlas({ initialStructureId, onPractice }: {
  initialStructureId?: string;
  onPractice?: (focus?: AnatomyFocus, structureId?: string) => void;
}) {
  const { language } = useI18n();
  const c = useTheme();
  const { width } = useWindowDimensions();
  const compact = width < 1100;
  const initial = anatomyStructure(initialStructureId ?? "deltoid") ?? anatomyStructure("deltoid")!;
  const [system, setSystem] = useState<AnatomySystem>(initial.system);
  const [view, setView] = useState<AnatomyView>(initial.views[0]!);
  const [selectedId, setSelectedId] = useState(initial.id);
  const [mode, setMode] = useState<"3d" | "2d">("3d");
  const [zoom, setZoom] = useState(1);
  const [search, setSearch] = useState("");
  const [isolate, setIsolate] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const [attachments, setAttachments] = useState(false);
  const [inspector, setInspector] = useState<"overview" | "attachments" | "quiz">("overview");
  const [reset, setReset] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [sourceError, setSourceError] = useState(false);
  const l = (fr: string, en: string) => language === "fr" ? fr : en;
  const selected = anatomyStructure(selectedId)!;
  const palette = anatomySystem(system);
  const muscle = muscleAttachments[selectedId];
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const results = useMemo(() => anatomyStructures.filter((item) =>
    search.trim() ? normalize(item.name[language] + " " + item.region[language]).includes(normalize(search.trim())) :
      item.system === system && (mode === "3d" || item.views.includes(view))), [search, language, system, view, mode]);
  const select = (id: string) => {
    const next = anatomyStructure(id);
    if (!next) return;
    setSelectedId(id);
    setSystem(next.system);
    setView((current) => next.views.includes(current) ? current : next.views[0]!);
    setSourceError(false);
  };
  useEffect(() => { if (initialStructureId) select(initialStructureId); }, [initialStructureId]);
  const changeSystem = (nextSystem: AnatomySystem) => {
    setSearch("");
    const next = anatomyStructures.find((item) => item.system === nextSystem && item.views.includes(view))
      ?? anatomyStructures.find((item) => item.system === nextSystem)!;
    select(next.id);
  };
  const changeView = (next: AnatomyView) => {
    setView(next); setReset((value) => value + 1);
    if (mode === "2d" && !selected.views.includes(next)) {
      const item = anatomyStructures.find((item) => item.system === system && item.views.includes(next));
      if (item) setSelectedId(item.id);
    }
  };
  const tool = (label: string, Icon: typeof Eye, action: () => void, active = false) => <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: active }} aria-pressed={active} onPress={action}
    style={{ minHeight: 42, padding: 11, borderRadius: 10, backgroundColor: active ? "#a9e62c" : "#322641", flexDirection: "row", alignItems: "center", gap: 7 }}>
    <Icon size={16} color={active ? "#231338" : "#ded2ee"} /><Txt style={{ color: active ? "#231338" : "#ded2ee", fontSize: 11, fontWeight: "600" }}>{label}</Txt>
  </Pressable>;
  const stageHeight = expanded ? (compact ? 660 : 820) : compact ? 470 : 620;
  return <View style={{ gap: 17 }}>
    <View style={{ gap: 5 }}>
      <View style={[wrap, { alignItems: "center", justifyContent: "space-between" }]}>
        <Title style={{ fontSize: 25 }}>{l("Atlas du corps humain", "Human body atlas")}</Title>
        <Txt muted style={{ fontSize: 11 }}>{anatomyStructures.length} {l("structures · 5 systèmes", "structures · 5 systems")}</Txt>
      </View>
      <Txt muted>{l("Explorez en volume. Isolez une structure, étudiez ses attaches, puis passez au rappel actif.", "Explore in three dimensions. Isolate a structure, study its attachments, then practise active recall.")}</Txt>
    </View>
    <View testID="anatomy-workspace" style={{ borderRadius: 23, overflow: "hidden", borderWidth: 1, borderColor: "#41314f", backgroundColor: "#171121" }}>
      <View style={{ padding: 14, borderBottomWidth: 1, borderColor: "#392a48", flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#ace827" }} />
          <Txt style={{ color: "#e5dcef", fontSize: 11, letterSpacing: 1.1, fontWeight: "700" }}>IPPOMED ATLAS</Txt>
        </View>
        <View style={{ flexDirection: "row", gap: 5 }}>
          {(["3d", "2d"] as const).map((value) => <Pressable key={value} accessibilityRole="button" accessibilityLabel={value === "3d" ? l("Vue 3D", "3D view") : l("Vue 2D", "2D view")} accessibilityState={{ selected: mode === value }} onPress={() => setMode(value)} style={{ paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8, backgroundColor: mode === value ? "#bfa1ff" : "#2b2038" }}>
            <Txt style={{ color: mode === value ? "#211331" : "#cfc1df", fontWeight: "700", fontSize: 12 }}>{value === "3d" ? "3D" : "2D"}</Txt>
          </Pressable>)}
        </View>
      </View>
      <View style={{ flexDirection: compact ? "column" : "row" }}>
        <View style={{ width: compact ? "100%" : 98, flexDirection: compact ? "row" : "column", flexWrap: "wrap", padding: 10, gap: 8, borderRightWidth: compact ? 0 : 1, borderBottomWidth: compact ? 1 : 0, borderColor: "#392a48" }}>
          {anatomySystems.map((item) => {
            const Icon = icons[item.id];
            return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={l("Calque", "Layer") + " : " + item.name[language]} accessibilityState={{ selected: system === item.id }} onPress={() => changeSystem(item.id)}
              style={{ flex: compact ? 1 : undefined, minWidth: compact ? 52 : undefined, minHeight: 64, borderRadius: 11, paddingVertical: 10, alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: system === item.id ? "#493362" : "#241a30", borderWidth: 1, borderColor: system === item.id ? "#b99be4" : "#34253e" }}>
              <Icon size={21} color={system === item.id ? "#bcf044" : "#9f8caf"} />
              <Txt style={{ color: system === item.id ? "#fff" : "#bcaacb", fontSize: 10 }}>{item.name[language]}</Txt>
            </Pressable>;
          })}
        </View>
        <View style={{ flex: 1, minWidth: 0, padding: compact ? 10 : 16, gap: 12 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <Txt style={{ color: "#b4a0c9", fontSize: 10, letterSpacing: 1.2 }}>{palette.name[language].toUpperCase()} · {mode === "3d" ? l("MODÈLE 3D SCHÉMATIQUE", "SCHEMATIC 3D MODEL") : l("VUE SCHÉMATIQUE 2D", "2D SCHEMATIC VIEW")}</Txt>
            <View style={{ flexDirection: "row", gap: 6 }}>
              <Pressable accessibilityRole="button" accessibilityLabel={l("Face", "Front")} onPress={() => changeView("anterior")} style={{ padding: 9, borderRadius: 8, backgroundColor: view === "anterior" ? "#4c3763" : "#2d2139" }}><Txt style={{ color: "#eee4fa", fontSize: 11 }}>{l("Face", "Front")}</Txt></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={l("Dos", "Back")} onPress={() => changeView("posterior")} style={{ padding: 9, borderRadius: 8, backgroundColor: view === "posterior" ? "#4c3763" : "#2d2139" }}><Txt style={{ color: "#eee4fa", fontSize: 11 }}>{l("Dos", "Back")}</Txt></Pressable>
            </View>
          </View>
          <View style={{ backgroundColor: mode === "3d" ? "#15101f" : "#f4f7f3", borderRadius: 17, overflow: "hidden", minHeight: stageHeight }}>
            {mode === "3d" ? <AnatomyScene resetKey={reset} system={system} selectedId={selectedId} onSelect={select} view={view} zoom={zoom} height={stageHeight} isolate={isolate} opacity={opacity} showAttachments={attachments && !!muscle} language={language} /> :
              <HumanFigure system={system} view={view} selectedId={selected.views.includes(view) ? selectedId : undefined} onSelect={select} zoom={zoom} height={stageHeight} language={language} />}
          </View>
          {attachments && muscle && <Txt style={{ color: "#d1bfdc", fontSize: 11 }}>{l("● Bleu : origine   ● Ambre : insertion — repères d’attache simplifiés.", "● Blue: origin   ● Amber: insertion — simplified attachment landmarks.")}</Txt>}
          <View style={[wrap, { gap: 7 }]}>
            {tool(l("Isoler", "Isolate"), Focus, () => setIsolate((value) => !value), isolate)}
            {tool(l("Attaches", "Attachments"), Layers3, () => { setAttachments((value) => !value); setInspector("attachments"); }, attachments)}
            {tool(l("Transparence", "Transparency"), Eye, () => setOpacity((value) => value === 1 ? 0.45 : value === 0.45 ? 0.2 : 1), opacity !== 1)}
            {tool(l("Agrandir la scène", "Expand scene"), Maximize2, () => setExpanded((value) => !value), expanded)}
            {tool(l("Revoir le corps entier", "Show the whole body"), RotateCcw, () => { setZoom(1); setIsolate(false); setOpacity(1); setReset((value) => value + 1); })}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 9, justifyContent: "center" }}>
            {tool(l("Dézoomer le corps", "Zoom out of body"), Minus, () => setZoom((value) => Math.max(1, value - 0.5)))}
            <Txt style={{ color: "#c8b6d5", fontSize: 11 }}>×{zoom.toFixed(1)}</Txt>
            {tool(l("Zoomer sur la structure", "Zoom into structure"), Plus, () => setZoom((value) => Math.min(2.5, value + 0.5)))}
          </View>
        </View>
        <View style={{ width: compact ? "100%" : 300, padding: 21, borderLeftWidth: compact ? 0 : 1, borderTopWidth: compact ? 1 : 0, borderColor: "#392a48", backgroundColor: "#21162c", gap: 16 }}>
          <Txt style={{ color: "#af99bf", fontSize: 10, letterSpacing: 1 }}>{selected.region[language].toUpperCase()}</Txt>
          <Title style={{ color: "#fff", fontSize: 24, lineHeight: 31 }}>{selected.name[language]}</Title>
          <View style={{ flexDirection: "row", gap: 5, flexWrap: "wrap" }}>
            {(["overview", "attachments", "quiz"] as const).map((value) => <Pressable key={value} accessibilityRole="button" accessibilityLabel={value === "overview" ? l("Fiche de structure", "Structure notes") : value === "attachments" ? l("Origines et insertions", "Origins and insertions") : l("Quiz sur cette structure", "Quiz this structure")} onPress={() => setInspector(value)}
              style={{ paddingVertical: 9, paddingHorizontal: 10, borderRadius: 8, backgroundColor: inspector === value ? "#513768" : "#30203e" }}>
              <Txt style={{ color: inspector === value ? "#d7f7a7" : "#c9b7d6", fontSize: 11 }}>{value === "overview" ? l("Fiche", "Notes") : value === "attachments" ? l("Attaches", "Attachments") : "Quiz"}</Txt>
            </Pressable>)}
          </View>
          {inspector === "overview" && <>
            <Txt style={{ color: "#e0d2e9", fontSize: 13, lineHeight: 23 }}>{selected.summary[language]}</Txt>
            {muscle && <Txt style={{ color: "#b7a2c9", fontSize: 12 }}>{l("Retrouvez les origines, les insertions, l’action et l’innervation dans l’onglet Attaches.", "Find origins, insertions, actions and innervation under Attachments.")}</Txt>}
          </>}
          {inspector === "attachments" && (muscle ? <View style={{ gap: 17 }}>
            {(Object.keys(focusLabels) as (keyof typeof focusLabels)[]).map((focus) => <View key={focus} style={{ gap: 5 }}>
              <Txt style={{ color: focus === "origin" ? "#8bd3ff" : focus === "insertion" ? "#f5c478" : "#cbb3df", fontSize: 11, fontWeight: "700" }}>{focusLabels[focus][language].toUpperCase()}</Txt>
              <Txt style={{ color: "#e1d5e9", fontSize: 12, lineHeight: 21 }}>{muscle[focus][language]}</Txt>
            </View>)}
          </View> : <Txt style={{ color: "#cbbbd7", fontSize: 12 }}>{l("Choisissez un muscle pour étudier ses origines et insertions.", "Select a muscle to study its origins and insertions.")}</Txt>)}
          {inspector === "quiz" && <View style={{ gap: 10 }}>
            <Txt style={{ color: "#cbbbd7", fontSize: 12 }}>{l("Testez ce que vous venez d’explorer. Le corrigé explique chaque réponse.", "Test what you have explored. Every answer includes an explanation.")}</Txt>
            {muscle && (Object.keys(focusLabels) as (keyof typeof focusLabels)[]).map((focus) => <Button key={focus} small label={l("Quiz · ", "Quiz · ") + focusLabels[focus][language]} onPress={() => onPractice?.(focus, selectedId)} disabled={!onPractice} />)}
            <Button small secondary label={l("Toutes les questions de cette structure", "All questions for this structure")} onPress={() => onPractice?.(undefined, selectedId)} disabled={!onPractice} />
          </View>}
          <View style={{ height: 1, backgroundColor: "#3e2c4c" }} />
          {(muscle?.sources ?? selected.sources.map((url) => ({ title: l("Référence anatomique", "Anatomy reference"), url }))).slice(0, 2).map((source, index) => <Pressable key={source.url + String(index)} accessibilityRole="link" onPress={() => { setSourceError(false); void Linking.openURL(source.url).catch(() => setSourceError(true)); }} style={{ flexDirection: "row", alignItems: "center", gap: 7, minHeight: 40 }}>
            <Txt style={{ color: "#bba0e4", fontSize: 11, flex: 1 }}>{source.title}</Txt><ArrowUpRight size={13} color="#bba0e4" />
          </Pressable>)}
          {sourceError && <Txt style={{ color: "#ffc7c7", fontSize: 11 }}>{l("Le lien n’a pas pu s’ouvrir.", "The link could not be opened.")}</Txt>}
          <Txt style={{ color: "#9d8bac", fontSize: 10 }}>{l("Modèle et fiches pédagogiques simplifiés. Relecture médicale en cours.", "Simplified educational model and notes. Medical review pending.")}</Txt>
          <Button label={l("S’entraîner en anatomie", "Practise anatomy")} small icon={Sparkles} onPress={() => onPractice?.()} disabled={!onPractice} />
        </View>
      </View>
      <View style={{ padding: 17, borderTopWidth: 1, borderColor: "#392a48", gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#493452", borderRadius: 11, paddingHorizontal: 12, backgroundColor: "#24182e", gap: 9 }}>
          <Search size={16} color="#ad97bf" /><TextInput accessibilityLabel={l("Rechercher une structure anatomique", "Search for an anatomical structure")} placeholder={l("Rechercher un muscle, un nerf, un organe…", "Search for a muscle, nerve or organ…")} placeholderTextColor="#967ea9" value={search} onChangeText={setSearch} style={{ color: "#eee4f7", minHeight: 44, flex: 1, minWidth: 0, fontSize: 13 }} />
        </View>
        <View style={[wrap, { gap: 7 }]}>{results.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.name[language]} accessibilityState={{ selected: item.id === selectedId }} onPress={() => select(item.id)} style={{ borderWidth: 1, borderColor: item.id === selectedId ? "#b7e858" : "#49344f", paddingHorizontal: 13, paddingVertical: 9, borderRadius: 9, backgroundColor: item.id === selectedId ? "#3a4525" : "#291b34" }}><Txt style={{ color: item.id === selectedId ? "#e0fbb4" : "#c4aed4", fontSize: 12 }}>{item.name[language]}</Txt></Pressable>)}</View>
        {!results.length && <Txt style={{ color: "#af9abd", fontSize: 12 }}>{l("Aucune structure trouvée.", "No structure found.")}</Txt>}
      </View>
    </View>
  </View>;
}
