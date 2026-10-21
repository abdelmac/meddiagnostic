import React, { useState } from "react";
import { Linking, Pressable, View } from "react-native";
import { ArrowUpRight, BookOpen, ChevronDown, ChevronUp, Play } from "lucide-react-native";
import { anatomyCourses, anatomyCourseForYear, anatomyCourseSources } from "../data/anatomy-courses";
import { anatomyStructure } from "../data/anatomy-structures";
import type { AnatomyFocus } from "../domain/types";
import { useI18n } from "../i18n";
import { AnatomyAtlas } from "./AnatomyAtlas";
import { Button, Card, Chip, Title, Txt, wrap } from "./components";
import { useTheme } from "./theme";
export function AnatomyCoursesPanel({ onPractice, initialYear = 1 }: {
  onPractice?: (year: number, focus?: AnatomyFocus, structureId?: string) => void;
  initialYear?: number;
}) {
  const { language } = useI18n();
  const c = useTheme();
  const [year, setYear] = useState(initialYear >= 7 ? 7 : Math.min(6, Math.max(1, initialYear)));
  const [focus, setFocus] = useState<number | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [linkError, setLinkError] = useState(false);
  const course = anatomyCourseForYear(year);
  const say = (fr: string, en: string) => language === "fr" ? fr : en;
  const yearLabel = (value: number) => value >= 7 ? say("Internat · 7e année et +", "Residency · Year 7+") : say(String(value) + (value === 1 ? "re" : "e") + " année", "Year " + String(value));
  return <View style={{ gap: 19 }}>
    <View style={{ gap: 10 }}>
      <View style={[wrap, { alignItems: "center", justifyContent: "space-between", gap: 12 }]}>
        <View style={{ gap: 3 }}>
          <Txt style={{ color: c.accent, fontSize: 11, fontWeight: "700", letterSpacing: 1 }}>{say("ANATOMIE · IPPOMED", "ANATOMY · IPPOMED")}</Txt>
          <Title style={{ fontSize: 27 }}>{say("Explorer. Comprendre. Retenir.", "Explore. Understand. Remember.")}</Title>
        </View>
        <Button secondary small label={notesOpen ? say("Masquer le cours", "Hide course notes") : say("Ouvrir le cours", "Open course notes")} icon={notesOpen ? ChevronUp : BookOpen} onPress={() => setNotesOpen((open) => !open)} />
      </View>
      <View style={wrap}>{anatomyCourses.map((item) => <Chip key={item.year} label={yearLabel(item.year)} selected={year === item.year} onPress={() => { setYear(item.year); setFocus(null); setLinkError(false); }} />)}</View>
      <Txt muted style={{ fontSize: 11 }}>{say("Un espace pour apprendre, de la première année à l’internat. Choisissez votre niveau, puis explorez à votre rythme.", "A place to learn from first year to residency. Choose your level, then explore at your own pace.")}</Txt>
    </View>
    <AnatomyAtlas initialStructureId={focus === null ? undefined : course.structureIds[focus]} onPractice={onPractice ? (objective, structureId) => onPractice(year, objective, structureId) : undefined} />
    <Card style={{ gap: 14 }}>
      <View style={[wrap, { alignItems: "center", justifyContent: "space-between" }]}>
        <View style={{ gap: 4 }}><Txt muted style={{ fontSize: 11 }}>{yearLabel(year)}</Txt><Title style={{ fontSize: 22 }}>{course.title[language]}</Title></View>
        <Button secondary small label={say("Passer aux questions illustrées", "Start illustrated questions")} icon={Play} onPress={() => onPractice?.(year)} disabled={!onPractice} />
      </View>
      <Txt>{course.introduction[language]}</Txt>
      <View style={wrap}>{course.structureIds.map((id, index) => <Chip key={id} label={anatomyStructure(id)?.name[language] ?? say("Repère", "Landmark") + " " + (index + 1)} selected={focus === index} onPress={() => setFocus(index)} />)}</View>
      <Button secondary small label={notesOpen ? say("Replier les fiches de cours", "Collapse course notes") : say("Lire les fiches de cours", "Read course notes")} icon={notesOpen ? ChevronUp : ChevronDown} onPress={() => setNotesOpen((open) => !open)} />
    </Card>
    {notesOpen && <View style={{ gap: 16 }}>
      <Title style={{ fontSize: 24 }}>{say("Le cours essentiel", "Core course notes")}</Title>
      <Card style={{ gap: 9 }}>{course.objectives.map((objective) => <Txt key={objective.fr}>• {objective[language]}</Txt>)}</Card>
      {course.sections.map((section, index) => <Card key={section.title.fr} style={{ gap: 10 }}><Txt style={{ color: c.accent, fontWeight: "700", fontSize: 11 }}>{say("FICHE ", "NOTE ") + (index + 1)}</Txt><Title style={{ fontSize: 20 }}>{section.title[language]}</Title><Txt>{section.body[language]}</Txt></Card>)}
      <Card style={{ gap: 12 }}>
        <Title style={{ fontSize: 20 }}>{say("Vérifier et approfondir", "Check and explore further")}</Title>
        {anatomyCourseSources(year).map((source) => <Pressable key={source.url} accessibilityRole="link" onPress={() => { setLinkError(false); void Linking.openURL(source.url).catch(() => setLinkError(true)); }} style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44 }}>
          <Txt style={{ color: c.accent, flex: 1, textDecorationLine: "underline", fontSize: 13 }}>{source.title}</Txt><ArrowUpRight size={16} color={c.accent} />
        </Pressable>)}
        {linkError && <Txt accessibilityRole="alert">{say("Impossible d’ouvrir ce lien.", "Unable to open this link.")}</Txt>}
        <Txt muted style={{ fontSize: 11 }}>{say("Repères de progression indicatifs : les cursus varient selon les pays. Fiches et modèles simplifiés, en attente de relecture médicale.", "These revision levels are indicative: curricula vary by country. Simplified notes and models, pending medical review.")}</Txt>
      </Card>
    </View>}
  </View>;
}
