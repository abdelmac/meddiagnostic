import React, { useMemo, useState } from "react";
import { TextInput, View } from "react-native";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react-native";
import { useI18n } from "../i18n";
import { getSource, searchSources, sourceCatalog } from "../data/source-catalog";
import { sourceDraftQuestions, type SourceSubject } from "../data/source-drafts";
import { Button, Card, Chip, Title, Txt, wrap } from "./components";
import { useTheme } from "./theme";

export function SourceCatalogPanel() {
  const { language } = useI18n();
  const c = useTheme();
  const copy = (fr: string, en: string) => language === "fr" ? fr : en;
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"sources" | "drafts">("sources");
  const [format, setFormat] = useState("all");
  const [limit, setLimit] = useState(6);
  const [expanded, setExpanded] = useState<string | null>(null);
  const sources = useMemo(() => searchSources(query, format), [query, format]);
  const drafts = useMemo(() => {
    const normalized = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return sourceDraftQuestions.filter((question) =>
      `${question[language].prompt} ${getSource(question.sourceId)?.title ?? ""}`
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(normalized),
    );
  }, [query, language]);
  const subject = (value: SourceSubject) => ({
    cardiovascular: copy("Anatomie cardiovasculaire", "Cardiovascular anatomy"),
    respiratory: copy("Anatomie respiratoire", "Respiratory anatomy"),
    histology: copy("Histologie", "Histology"),
    embryology: copy("Embryologie", "Embryology"),
    physiology: copy("Physiologie", "Physiology"),
  })[value];
  const inspection = (value: string) => ({
    "text-detected": copy("Texte détecté dans un échantillon", "Text detected in a sample"),
    "text-extracted": copy("Pages extraites pour la rédaction", "Pages extracted for authoring"),
    "ocr-needed": copy("Pas de texte dans l’échantillon initial", "No text in the initial sample"),
    "sample-no-text": copy("Pas de texte dans l’échantillon initial", "No text in the initial sample"),
    "not-extracted": copy("Contenu à examiner", "Content awaiting inspection"),
    "unreadable": copy("Lecture PDF à réparer", "PDF reading needs repair"),
    "encrypted": copy("Document protégé", "Protected document"),
    "archive-unreadable": copy("Archive à examiner", "Archive awaiting inspection"),
  })[value] ?? copy("À examiner", "Awaiting inspection");
  const count = tab === "sources" ? sources.length : drafts.length;
  return (
    <Card style={{ gap: 18 }}>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <BookOpen size={23} color={c.accent} />
        <Title style={{ fontSize: 22 }}>{copy("Bibliothèque & nouveaux contenus", "Library & new content")}</Title>
      </View>
      <Txt muted>
        {copy(
          `${sourceCatalog.sources.length} références indexées, dont les ressources des archives. ${sourceDraftQuestions.length} questions originales en français et en anglais préparées à partir de pages effectivement lues.`,
          `${sourceCatalog.sources.length} indexed references, including archive resources. ${sourceDraftQuestions.length} original French and English questions prepared from pages actually read.`,
        )}
      </Txt>
      <View style={{ padding: 14, backgroundColor: c.soft, borderRadius: 10, gap: 5 }}>
        <Txt style={{ fontWeight: "600" }}>{copy("Validation médicale en attente", "Medical review pending")}</Txt>
        <Txt muted style={{ fontSize: 12 }}>
          {copy(
            "Ces questions sont des brouillons consultables, exclus des quiz notés et des classements. Les livres et leurs images restent privés. Une référence indexée ne signifie pas que tout son contenu a été lu ou validé.",
            "These questions are viewable drafts, excluded from scored quizzes and rankings. Books and their images remain private. An indexed reference does not mean its entire contents have been read or validated.",
          )}
        </Txt>
      </View>
      <View style={wrap}>
        <Chip label={copy("Ouvrages et cours", "Books and courses")} selected={tab === "sources"} onPress={() => { setTab("sources"); setLimit(6); }} />
        <Chip label={copy(`Questions en préparation (${sourceDraftQuestions.length})`, `Question drafts (${sourceDraftQuestions.length})`)} selected={tab === "drafts"} onPress={() => { setTab("drafts"); setLimit(6); }} />
      </View>
      <TextInput
        accessibilityLabel={copy("Rechercher dans la bibliothèque", "Search the library")}
        placeholder={copy("Rechercher un titre, un cours, une question…", "Search for a title, course or question…")}
        placeholderTextColor={c.muted}
        value={query}
        onChangeText={(value) => { setQuery(value); setLimit(6); }}
        style={{ color: c.text, backgroundColor: c.bg, borderColor: c.line, borderWidth: 1, borderRadius: 10, padding: 14, minHeight: 48 }}
      />
      {tab === "sources" && <View style={wrap}>
        {["all", "pdf", "avi", "iso"].map((value) => <Chip key={value} label={value === "all" ? copy("Tous les formats", "All formats") : value === "avi" ? copy("Vidéos", "Videos") : value.toUpperCase()} selected={format === value} onPress={() => { setFormat(value); setLimit(6); }} />)}
      </View>}
      <Txt muted accessibilityLiveRegion="polite">{copy(`${count} résultat${count === 1 ? "" : "s"}`, `${count} result${count === 1 ? "" : "s"}`)}</Txt>
      {tab === "sources" ? sources.slice(0, limit).map((source) => (
        <View key={source.id} style={{ borderTopWidth: 1, borderColor: c.line, paddingTop: 14, gap: 5 }}>
          <Txt style={{ fontWeight: "600" }}>{source.title}</Txt>
          <Txt muted style={{ fontSize: 12 }}>{source.collection}</Txt>
          <Txt muted style={{ fontSize: 12 }}>
            {[source.format.toUpperCase(), source.pages ? `${source.pages} pages` : null, inspection(source.inspection)].filter(Boolean).join(" · ")}
          </Txt>
          <Txt muted style={{ fontSize: 11 }}>{copy("Référence documentaire · droits de republication à vérifier", "Documentary reference · republication rights require verification")}</Txt>
        </View>
      )) : drafts.slice(0, limit).map((question) => {
        const current = question[language];
        const open = expanded === question.id;
        return (
          <View key={question.id} style={{ borderTopWidth: 1, borderColor: c.line, paddingTop: 14, gap: 10 }}>
            <Txt muted style={{ fontSize: 12 }}>{subject(question.subject)} · {copy("Brouillon", "Draft")}</Txt>
            <Txt style={{ fontWeight: "600" }}>{current.prompt}</Txt>
            <Txt muted style={{ fontSize: 12 }}>{getSource(question.sourceId)?.title} · {copy("page(s) du PDF", "PDF page(s)")} {question.pdfPages.join(", ")}</Txt>
            <View style={{ alignSelf: "flex-start" }}><Button secondary small icon={open ? ChevronUp : ChevronDown} label={copy(open ? "Fermer l’aperçu" : "Voir le brouillon", open ? "Close preview" : "Preview draft")} onPress={() => setExpanded(open ? null : question.id)} /></View>
            {open && <View style={{ backgroundColor: c.bg, padding: 14, borderRadius: 10, gap: 10 }}>
              {current.options.map((option, index) => <Txt key={index} style={{ color: index === question.correct ? c.accent : c.text, fontWeight: index === question.correct ? "600" : "400" }}>{`${String.fromCharCode(65 + index)}. ${option}${index === question.correct ? copy(" — réponse proposée", " — proposed answer") : ""}`}</Txt>)}
              <Txt>{current.explanation}</Txt>
              <Txt muted style={{ fontSize: 11 }}>{copy("Proposition éditoriale non relue par un professionnel de santé.", "Editorial proposal not yet reviewed by a healthcare professional.")}</Txt>
            </View>}
          </View>
        );
      })}
      {limit < count && <Button secondary small label={copy("Afficher plus", "Show more")} icon={ChevronDown} onPress={() => setLimit((value) => value + 12)} />}
    </Card>
  );
}
