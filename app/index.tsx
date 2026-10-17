import { useCatalog } from "../src/i18n/catalog";
import { LanguageSwitch } from "../src/ui/LanguageSwitch";
import { AccountPanel } from "../src/ui/AccountPanel";
import { SubscriptionPanel } from "../src/ui/SubscriptionPanel";
import { DeleteAccountPanel } from "../src/ui/DeleteAccountPanel";
import { useAuth } from "../src/auth";
import { useI18n } from "../src/i18n";
import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  useWindowDimensions,
  Linking,
  Platform,
  Share,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flag,
  GraduationCap,
  Heart,
  Home,
  Layers3,
  Leaf,
  Lightbulb,
  ListChecks,
  Moon,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
  X,
  Zap,
  Download,
  Trash2,
  type LucideIcon,
} from "lucide-react-native";
import Svg, { Path, Circle, Rect, Line } from "react-native-svg";
import { questions, specialties } from "../src/data/questions";
import {
  accuracy,
  createSession,
  dueIds,
  finishSession,
  initialState,
  recordAnswer,
  score,
  uid,
} from "../src/domain/engine";
import type {
  Confidence,
  Question,
  Session,
  Specialty,
} from "../src/domain/types";
import { useStore } from "../src/state";
import { useTheme } from "../src/ui/theme";
import {
  Bar,
  Button,
  Card,
  Chip,
  Empty,
  Loading,
  Organ,
  Title,
  Txt,
  row,
  wrap,
} from "../src/ui/components";

type Tab = "Accueil" | "Spécialités" | "Révisions" | "Progression" | "Profil";
const nav: { label: Tab; icon: LucideIcon }[] = [
  { label: "Accueil", icon: Home },
  { label: "Spécialités", icon: Layers3 },
  { label: "Révisions", icon: RotateCcw },
  { label: "Progression", icon: TrendingUp },
  { label: "Profil", icon: UserRound },
];
const getQ = (id: string) => questions.find((q) => q.id === id)!;
const day = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

function HeroArt() {
  return (
    <Svg
      width={270}
      height={216}
      viewBox="0 0 300 240"
      accessibilityElementsHidden
    >
      <Circle cx="151" cy="124" r="91" fill="#d7e7db" />
      <Circle
        cx="151"
        cy="124"
        r="105"
        stroke="#b6d2bd"
        strokeDasharray="3 9"
        fill="none"
      />
      <Rect
        x="95"
        y="42"
        width="125"
        height="159"
        rx="12"
        fill="#c2d6c8"
        transform="rotate(9 155 120)"
      />
      <Rect
        x="86"
        y="35"
        width="125"
        height="159"
        rx="12"
        fill="#fffefa"
        transform="rotate(-7 149 115)"
      />
      <Rect x="121" y="27" width="52" height="19" rx="6" fill="#88b3a2" />
      <Path
        d="M105 78 L114 86 L128 68 M105 111 L114 119 L128 101 M105 144 L114 152 L128 134"
        stroke="#438975"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M141 75 L185 70 M141 85 L174 81 M141 108 L185 103 M141 118 L175 114 M141 141 L180 137 M141 151 L167 148"
        stroke="#d2ded6"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <Circle cx="222" cy="159" r="35" fill="#fffefa" />
      <Path
        d="M202 159 L213 159 L219 145 L226 172 L232 158 L241 158"
        fill="none"
        stroke="#428c77"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="62" cy="64" r="18" fill="#f9f0d5" />
      <Path
        d="M56 64 L60 68 L68 59"
        stroke="#ae9251"
        strokeWidth="2"
        fill="none"
      />
      <Path
        d="M56 178 Q40 151 45 137 Q65 140 62 164 M56 178 Q71 152 83 155 Q85 173 56 178"
        fill="#8eb6a0"
      />
      <Line
        x1="55"
        y1="161"
        x2="57"
        y2="197"
        stroke="#709981"
        strokeWidth="2"
      />
    </Svg>
  );
}

export default function App() {
  const { user } = useAuth();
  const { questions, specialties, getQ, day } = useCatalog();

  const { t, language } = useI18n();

  const { state, update, ready, error } = useStore();
  const c = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 1050;
  const desktop = width >= 780;
  const [tab, setTab] = useState<Tab>("Accueil");
  const [configure, setConfigure] = useState(false);
  const [specialty, setSpecialty] = useState<Specialty | undefined>();
  const [quizOpen, setQuizOpen] = useState(false);
  const [result, setResult] = useState<Session | null>(null);
  const [correction, setCorrection] = useState<{
    question: Question;
    choice?: number;
  } | null>(null);
  const [premium, setPremium] = useState(false);
  const [notice, setNotice] = useState("");
  const due = dueIds(state);
  const today = state.attempts.filter(
    (a) => new Date(a.at).toDateString() === new Date().toDateString(),
  );
  const unique = new Set(state.attempts.map((a) => a.questionId));
  const doneToday = new Set(today.map((a) => a.questionId)).size;
  const openConfig = (id?: Specialty) => {
    setSpecialty(id);
    setConfigure(true);
  };
  const startReview = () => {
    if (state.active) {
      setQuizOpen(true);
      return;
    }
    const ids = due.filter((id) => questions.some((q) => q.id === id));
    if (!ids.length) {
      setNotice(
        "Aucune révision échue. Retrouvez vos erreurs et favoris ci-dessous.",
      );
      return;
    }
    update((s) => ({
      ...s,
      active: createSession(questions, {
        specialties: specialties.map((s) => s.id),
        difficulty: "toutes",
        type: "tous",
        count: 20,
        mode: "learning",
        timerMinutes: null,
        ids,
        kind: "review",
      }),
    }));
    setQuizOpen(true);
  };
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 5500);
    return () => clearTimeout(t);
  }, [notice]);
  if (!ready) return <Loading />;
  const go = (t: Tab) => {
    setTab(t);
    setNotice("");
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flex: 1, flexDirection: "row" }}>
        {desktop && (
          <View
            style={{
              width: 225,
              backgroundColor: c.card,
              borderRightWidth: 1,
              borderColor: c.line,
              padding: 24,
              paddingTop: 35,
            }}
          >
            <View style={[row, { gap: 9, marginBottom: 43 }]}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  backgroundColor: c.accent,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Activity color="#fff" size={23} />
              </View>
              <Txt
                style={{ fontWeight: "800", fontSize: 24, letterSpacing: -1 }}
              >
                Med
                <Txt
                  style={{ fontSize: 24, color: c.accent, fontWeight: "800" }}
                >
                  {t("Quiz")}
                </Txt>
              </Txt>
            </View>
            <Txt
              muted
              style={{ fontSize: 9, letterSpacing: 2, marginBottom: 14 }}
            >
              {t("VOTRE ESPACE D’APPRENTISSAGE")}
            </Txt>
            {nav.map(({ label, icon: Icon }) => (
              <Pressable
                key={label}
                accessibilityRole="button"
                accessibilityState={{ selected: tab === label }}
                onPress={() => go(label)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 13,
                  paddingHorizontal: 13,
                  paddingVertical: 14,
                  borderRadius: 10,
                  backgroundColor: tab === label ? c.soft : "transparent",
                  marginBottom: 7,
                }}
              >
                <Icon size={19} color={tab === label ? c.accent : c.muted} />
                <Txt
                  style={{
                    fontWeight: tab === label ? "600" : "400",
                    color: tab === label ? c.accent : c.muted,
                    fontSize: 13,
                  }}
                >
                  {label}
                </Txt>
                {label === "Révisions" && due.length > 0 && (
                  <View
                    style={{
                      marginLeft: "auto",
                      borderRadius: 5,
                      backgroundColor: c.accent,
                      paddingHorizontal: 6,
                    }}
                  >
                    <Txt style={{ fontSize: 10, color: "#fff" }}>
                      {due.length}
                    </Txt>
                  </View>
                )}
              </Pressable>
            ))}
            <View style={{ flex: 1, minHeight: 35 }} />
            <View
              style={{
                backgroundColor: c.soft,
                padding: 17,
                borderRadius: 13,
                gap: 9,
              }}
            >
              <Sparkles color={c.accent} size={21} />
              <Txt style={{ fontWeight: "700", fontSize: 13 }}>
                {t("Un peu chaque jour.")}
              </Txt>
              <Txt muted style={{ fontSize: 11, lineHeight: 18 }}>
                {t("Le raisonnement se construit une question à la fois.")}
              </Txt>
              <Pressable
                accessibilityRole="button"
                onPress={() => setPremium(true)}
              >
                <Txt
                  style={{ fontSize: 11, color: c.accent, fontWeight: "600" }}
                >
                  {t("Découvrir MedQuiz Premium ↗")}
                </Txt>
              </Pressable>
            </View>
            <View
              style={[
                row,
                {
                  paddingTop: 24,
                  marginTop: 22,
                  borderTopWidth: 1,
                  borderColor: c.line,
                },
              ]}
            >
              <View
                style={{
                  width: 35,
                  height: 35,
                  borderRadius: 18,
                  backgroundColor: c.hero,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <UserRound size={18} color={c.accent} />
              </View>
              <View>
                <Txt style={{ fontSize: 12, fontWeight: "600" }}>
                  {t(user ? "Mon compte" : "Espace invité")}
                </Txt>
                <Txt muted style={{ fontSize: 10 }}>
                  {t(
                    user
                      ? "Progression liée à votre compte"
                      : "Progression sur cet appareil",
                  )}
                </Txt>
              </View>
            </View>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <View
            style={{
              height: 74,
              backgroundColor: c.card,
              borderBottomWidth: 1,
              borderColor: c.line,
              paddingHorizontal: desktop ? 38 : 20,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {desktop ? (
              <View style={row}>
                <Txt muted style={{ fontSize: 12 }}>
                  {t("Mon espace")}
                </Txt>
                <ChevronRight size={13} color={c.muted} />
                <Txt style={{ fontSize: 12, fontWeight: "500" }}>{tab}</Txt>
              </View>
            ) : (
              <View style={row}>
                <Activity size={25} color={c.accent} />
                <Txt style={{ fontWeight: "800", fontSize: 21 }}>
                  {t("MedQuiz")}
                </Txt>
              </View>
            )}
            <View style={row}>
              <LanguageSwitch />
              {desktop && (
                <View
                  style={{
                    backgroundColor: c.soft,
                    borderRadius: 20,
                    paddingHorizontal: 12,
                    paddingVertical: 3,
                  }}
                >
                  <Txt style={{ fontSize: 10, color: c.accent }}>
                    {t("Version découverte")}
                  </Txt>
                </View>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("Ouvrir le profil")}
                onPress={() => go("Profil")}
                style={{ padding: 8 }}
              >
                <UserRound color={c.muted} size={19} />
              </Pressable>
            </View>
          </View>
          <ScrollView
            contentContainerStyle={{
              padding: desktop ? 36 : 20,
              paddingTop: 28,
              paddingBottom: 40,
              maxWidth: 1320,
              width: "100%",
              alignSelf: "center",
              gap: 25,
            }}
          >
            {!!error && (
              <Card style={{ backgroundColor: c.errorBg }}>
                <Txt style={{ color: c.error }}>{error}</Txt>
              </Card>
            )}
            {!!notice && (
              <View
                accessibilityRole="alert"
                style={{
                  backgroundColor: c.soft,
                  padding: 14,
                  borderRadius: 10,
                }}
              >
                <Txt>{notice}</Txt>
              </View>
            )}
            {tab === "Accueil" && (
              <>
                <View
                  style={[
                    row,
                    { justifyContent: "space-between", flexWrap: "wrap" },
                  ]}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt muted style={{ fontSize: 11, letterSpacing: 0.4 }}>
                      {t("VOTRE RENDEZ-VOUS AVEC LA CLINIQUE")}
                    </Txt>
                    <Title style={{ marginTop: 4 }}>
                      Un nouveau jour pour apprendre{" "}
                      <Txt style={{ fontSize: 26 }}>☀</Txt>
                    </Title>
                    <Txt muted style={{ fontSize: 13, marginTop: 5 }}>
                      {t(
                        "Un cas, un déclic. Construisez vos réflexes, à votre rythme.",
                      )}
                    </Txt>
                  </View>
                </View>
                <View
                  style={{
                    backgroundColor: c.hero,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: c.line,
                    padding: wide ? 30 : 24,
                    flexDirection: "row",
                    alignItems: "center",
                    overflow: "hidden",
                    minHeight: 255,
                  }}
                >
                  <View style={{ flex: 1, gap: 13, maxWidth: 510 }}>
                    <View style={[row, { gap: 6 }]}>
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: c.accent,
                        }}
                      />
                      <Txt
                        style={{
                          fontSize: 10,
                          color: c.accent,
                          fontWeight: "600",
                          letterSpacing: 1.3,
                        }}
                      >
                        {t("APPRENDRE. COMPRENDRE. RETENIR.")}
                      </Txt>
                    </View>
                    <Title style={{ fontSize: wide ? 31 : 27, lineHeight: 39 }}>
                      {t(
                        "Les bons réflexes commencent{0}par les bonnes questions.",
                        { 0: wide ? "\n" : " " },
                      )}
                    </Title>
                    <Txt
                      style={{
                        color: c.navy,
                        fontSize: 13,
                        lineHeight: 22,
                        maxWidth: 420,
                      }}
                    >
                      {t(
                        "Reconnaissez les pathologies, comprenez vos erreurs et révisez ce que vous oubliez.",
                      )}
                    </Txt>
                    <View
                      style={[wrap, { alignItems: "center", marginTop: 3 }]}
                    >
                      <Button
                        label={t(
                          state.active
                            ? "Reprendre mon quiz"
                            : "Essayer un quiz",
                        )}
                        icon={Play}
                        onPress={() =>
                          state.active ? setQuizOpen(true) : openConfig()
                        }
                      />
                      <Txt style={{ fontSize: 10, color: c.navy }}>
                        {t("5 questions · Sans compte · Gratuit")}
                      </Txt>
                    </View>
                  </View>
                  {wide && (
                    <View style={{ marginLeft: "auto" }}>
                      <HeroArt />
                    </View>
                  )}
                </View>
                <View style={[wrap, { gap: 14 }]}>
                  {[
                    {
                      icon: BookOpen,
                      label: "Questions explorées",
                      value: String(unique.size),
                      detail: t("sur {0} cas de démonstration", {
                        0: questions.length,
                      }),
                      color: c.accent,
                    },
                    {
                      icon: Target,
                      label: "Réussite · questions nouvelles",
                      value: state.attempts.length
                        ? `${accuracy(state.attempts.filter((a) => !a.repeated))} %`
                        : "—",
                      detail: "Un indicateur d’apprentissage",
                      color: "#b98b47",
                    },
                    {
                      icon: RotateCcw,
                      label: "Révisions du jour",
                      value: String(due.length),
                      detail: due.length
                        ? "Des notions à consolider"
                        : "Tout est à jour pour le moment",
                      color: "#7a79a5",
                    },
                  ].map(({ icon: Icon, label, value, detail, color }) => (
                    <Card
                      key={label}
                      style={{
                        flex: 1,
                        minWidth: desktop ? 185 : 145,
                        padding: 19,
                      }}
                    >
                      <View style={[row, { justifyContent: "space-between" }]}>
                        <Txt muted style={{ fontSize: 11 }}>
                          {label}
                        </Txt>
                        <Icon size={18} color={color} />
                      </View>
                      <Txt
                        style={{
                          fontSize: 28,
                          lineHeight: 40,
                          fontWeight: "700",
                          marginTop: 7,
                        }}
                      >
                        {value}
                      </Txt>
                      <Txt muted style={{ fontSize: 10 }}>
                        {detail}
                      </Txt>
                    </Card>
                  ))}
                </View>
                <View
                  style={{ flexDirection: wide ? "row" : "column", gap: 24 }}
                >
                  <View style={{ flex: 1, gap: 18 }}>
                    <View style={[row, { justifyContent: "space-between" }]}>
                      <Title
                        style={{
                          fontSize: 19,
                          lineHeight: 26,
                          letterSpacing: -0.3,
                        }}
                      >
                        {t("À chaque spécialité, ses déclics")}
                      </Title>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => go("Spécialités")}
                      >
                        <Txt style={{ fontSize: 11, color: c.accent }}>
                          {t("Tout explorer →")}
                        </Txt>
                      </Pressable>
                    </View>
                    <View style={[wrap, { gap: 13 }]}>
                      {specialties.map((s) => (
                        <Pressable
                          key={s.id}
                          accessibilityRole="button"
                          accessibilityLabel={t("Commencer un quiz de {0}", {
                            0: s.name,
                          })}
                          onPress={() => openConfig(s.id)}
                          style={({ hovered }: any) => ({
                            flex: 1,
                            minWidth: 155,
                            backgroundColor: c.card,
                            borderRadius: 15,
                            borderWidth: 1,
                            borderColor: hovered ? c.accent : c.line,
                            padding: 17,
                          })}
                        >
                          <View
                            style={{
                              backgroundColor: s.tint,
                              borderRadius: 11,
                              height: 95,
                              alignItems: "center",
                              justifyContent: "center",
                              marginBottom: 15,
                            }}
                          >
                            <Organ kind={s.icon} size={91} color={s.color} />
                          </View>
                          <Txt style={{ fontWeight: "700", fontSize: 13 }}>
                            {s.name}
                          </Txt>
                          <Txt muted style={{ fontSize: 10, marginTop: 3 }}>
                            {t("10 cas cliniques · Démonstration")}
                          </Txt>
                          <View style={{ marginTop: 15 }}>
                            <Bar
                              value={
                                new Set(
                                  state.attempts
                                    .filter(
                                      (a) =>
                                        getQ(a.questionId)?.specialty === s.id,
                                    )
                                    .map((a) => a.questionId),
                                ).size * 10
                              }
                              color={s.color}
                            />
                          </View>
                          <View
                            style={[
                              row,
                              { justifyContent: "space-between", marginTop: 7 },
                            ]}
                          >
                            <Txt muted style={{ fontSize: 9 }}>
                              {t("Explorer la spécialité")}
                            </Txt>
                            <ArrowRight size={13} color={s.color} />
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                  <Card
                    style={{
                      width: wide ? 263 : undefined,
                      padding: 21,
                      gap: 13,
                    }}
                  >
                    <View style={row}>
                      <View
                        style={{
                          padding: 8,
                          backgroundColor: c.yellow,
                          borderRadius: 9,
                        }}
                      >
                        <Target size={17} color="#a37f3a" />
                      </View>
                      <Txt style={{ fontWeight: "700", fontSize: 13 }}>
                        {t("Votre petit pas du jour")}
                      </Txt>
                    </View>
                    <Txt muted style={{ fontSize: 12, lineHeight: 21 }}>
                      {t(
                        "La régularité fait la différence. Un objectif accessible, chaque jour.",
                      )}
                    </Txt>
                    <View style={[row, { justifyContent: "space-between" }]}>
                      <Txt style={{ fontSize: 12, fontWeight: "600" }}>
                        {t("Objectif quotidien")}
                      </Txt>
                      <Txt style={{ fontSize: 11, color: c.accent }}>
                        {doneToday} / {state.preferences.dailyGoal}
                      </Txt>
                    </View>
                    <Bar
                      value={(100 * doneToday) / state.preferences.dailyGoal}
                    />
                    <View style={[row, { gap: 6 }]}>
                      <Clock3 size={13} color={c.muted} />
                      <Txt muted style={{ fontSize: 10 }}>
                        {t("Quelques minutes pour progresser")}
                      </Txt>
                    </View>
                    <Button
                      small
                      secondary
                      label={t(
                        due.length
                          ? "Mes révisions du jour"
                          : "Commencer une session",
                      )}
                      onPress={due.length ? startReview : () => openConfig()}
                    />
                  </Card>
                </View>
                <View
                  style={{
                    backgroundColor: c.card,
                    borderWidth: 1,
                    borderColor: c.line,
                    borderRadius: 15,
                    padding: 21,
                    flexDirection: "row",
                    gap: 15,
                    alignItems: "center",
                  }}
                >
                  <View
                    style={{
                      backgroundColor: c.soft,
                      padding: 11,
                      borderRadius: 12,
                    }}
                  >
                    <Lightbulb color={c.accent} size={22} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt style={{ fontWeight: "600", fontSize: 13 }}>
                      {t(
                        "Une erreur aujourd’hui. Un raisonnement plus solide demain.",
                      )}
                    </Txt>
                    <Txt muted style={{ fontSize: 11, marginTop: 2 }}>
                      {t(
                        "Chaque correction explique les indices clés et pourquoi les autres réponses conviennent moins.",
                      )}
                    </Txt>
                  </View>
                  {desktop && <Leaf size={25} color="#aac3b5" />}
                </View>
                <View style={[row, { justifyContent: "center", gap: 7 }]}>
                  <ShieldCheck size={13} color={c.muted} />
                  <Txt muted style={{ fontSize: 10, textAlign: "center" }}>
                    {t(
                      "Formation uniquement · Cas fictifs non relus médicalement · Aucune donnée de patient",
                    )}
                  </Txt>
                </View>
              </>
            )}
            {tab === "Spécialités" && (
              <>
                <PageHeading
                  eyebrow={t("EXPLORER LE CATALOGUE")}
                  title={t("Les premiers repères de la clinique")}
                  description={t(
                    "Trois spécialités, 30 cas pour commencer à relier les signes et les hypothèses.",
                  )}
                />
                {specialties.map((s) => (
                  <Card key={s.id} style={{ gap: 16 }}>
                    <View style={row}>
                      <View
                        style={{ backgroundColor: s.tint, borderRadius: 14 }}
                      >
                        <Organ kind={s.icon} color={s.color} size={88} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Title style={{ fontSize: 22 }}>{s.name}</Title>
                        <Txt muted>{s.subtitle}</Txt>
                        <Txt muted style={{ fontSize: 11 }}>
                          {t(
                            "10 questions · Clinique · Débutant et intermédiaire",
                          )}
                        </Txt>
                      </View>
                    </View>
                    <View style={wrap}>
                      {[
                        ...new Set(
                          questions
                            .filter((q) => q.specialty === s.id)
                            .map((q) => q.theme),
                        ),
                      ].map((topic) => (
                        <Chip key={topic} label={t(topic)} />
                      ))}
                    </View>
                    <Button
                      label={t("Travailler la {0}", {
                        0: s.name.toLowerCase(),
                      })}
                      onPress={() => openConfig(s.id)}
                    />
                  </Card>
                ))}
                <Txt muted style={{ fontSize: 12 }}>
                  {t(
                    "Les cas visuels et mixtes seront proposés après acquisition des images et validation éditoriale. Les autres spécialités seront ajoutées lorsqu’elles seront prêtes.",
                  )}
                </Txt>
              </>
            )}
            {tab === "Révisions" && (
              <RevisionScreen
                startReview={startReview}
                openCorrection={(q) =>
                  setCorrection({
                    question: q,
                    choice: [...state.attempts]
                      .reverse()
                      .find((a) => a.questionId === q.id)?.choice,
                  })
                }
                openConfig={() => openConfig()}
              />
            )}
            {tab === "Progression" && (
              <ProgressScreen openSession={(s) => setResult(s)} />
            )}
            {tab === "Profil" && (
              <ProfileScreen
                notice={setNotice}
                premium={() => setPremium(true)}
              />
            )}
          </ScrollView>
          {!desktop && (
            <View
              style={{
                flexDirection: "row",
                backgroundColor: c.card,
                borderTopWidth: 1,
                borderColor: c.line,
                paddingTop: 9,
                paddingBottom: 8,
              }}
            >
              {nav.map(({ label, icon: Icon }) => (
                <Pressable
                  key={label}
                  accessibilityRole="button"
                  accessibilityState={{ selected: tab === label }}
                  onPress={() => go(label)}
                  style={{
                    flex: 1,
                    alignItems: "center",
                    gap: 2,
                    paddingVertical: 4,
                    minHeight: 46,
                  }}
                >
                  <Icon size={20} color={tab === label ? c.accent : c.muted} />
                  <Txt
                    style={{
                      fontSize: 9,
                      color: tab === label ? c.accent : c.muted,
                    }}
                  >
                    {label}
                  </Txt>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>
      <Sheet
        visible={configure}
        onClose={() => setConfigure(false)}
        title={t("Votre prochaine session")}
      >
        <Configure
          specialty={specialty}
          onStart={() => {
            setConfigure(false);
            setQuizOpen(true);
          }}
        />
      </Sheet>
      <Modal
        visible={quizOpen && !!state.active}
        animationType="slide"
        onRequestClose={() => setQuizOpen(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
          <Quiz
            close={() => setQuizOpen(false)}
            complete={(session) => {
              setQuizOpen(false);
              setResult(session);
            }}
          />
        </SafeAreaView>
      </Modal>
      <Sheet
        visible={!!result}
        onClose={() => setResult(null)}
        title={t("Bilan de votre session")}
      >
        {result && (
          <Result
            session={result}
            openCorrection={(q, choice) => {
              setResult(null);
              setCorrection({ question: q, choice });
            }}
            revise={() => {
              setResult(null);
              go("Révisions");
            }}
          />
        )}
      </Sheet>
      <Sheet
        visible={!!correction}
        onClose={() => setCorrection(null)}
        title={t("Comprendre le raisonnement")}
      >
        {correction && (
          <Correction
            question={correction.question}
            choice={correction.choice}
          />
        )}
      </Sheet>
      <Sheet
        visible={premium}
        onClose={() => setPremium(false)}
        title={t("MedQuiz Premium")}
      >
        <View style={{ gap: 20 }}>
          <SubscriptionPanel />
          <View style={[row, { gap: 9 }]}>
            <Sparkles color={c.accent} />
            <Title style={{ fontSize: 23 }}>
              {t("Plus de repères, à votre rythme.")}
            </Title>
          </View>
          <Txt>
            {t(
              "À terme : banque publiée complète, examens blancs, révisions adaptatives et packs hors connexion.",
            )}
          </Txt>
          <Card style={{ backgroundColor: c.soft, gap: 8 }}>
            <Txt style={{ fontWeight: "700" }}>{t("Offre en préparation")}</Txt>
            <Txt>
              {t(
                "Tarifs commerciaux non validés. Cette version ne propose que des achats sandbox après configuration.",
              )}
            </Txt>
          </Card>
          <Txt muted>
            {t(
              "Les prix définitifs, les conditions de renouvellement et la restauration des achats seront fournis par les boutiques et le prestataire de paiement. Cette démonstration reste gratuite.",
            )}
          </Txt>
          <Button
            secondary
            label={t("Continuer à apprendre")}
            onPress={() => setPremium(false)}
          />
        </View>
      </Sheet>
    </SafeAreaView>
  );
}

function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <View style={{ gap: 7 }}>
      <Txt muted style={{ fontSize: 10, letterSpacing: 1.5 }}>
        {eyebrow}
      </Txt>
      <Title>{title}</Title>
      <Txt muted>{description}</Txt>
    </View>
  );
}
function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const { t, language } = useI18n();

  const c = useTheme();
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "#0e282b80",
          justifyContent: "center",
          padding: Platform.OS === "web" ? 24 : 12,
        }}
      >
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: c.bg,
            borderRadius: 20,
            maxWidth: 790,
            width: "100%",
            alignSelf: "center",
            maxHeight: "94%",
            overflow: "hidden",
          }}
        >
          <View
            style={[
              row,
              {
                justifyContent: "space-between",
                padding: 22,
                borderBottomWidth: 1,
                borderColor: c.line,
              },
            ]}
          >
            <Title style={{ fontSize: 19, lineHeight: 27, flex: 1 }}>
              {title}
            </Title>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("Fermer")}
              onPress={onClose}
              style={{ padding: 10 }}
            >
              <X size={21} color={c.text} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={{ padding: 24, gap: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Configure({
  specialty,
  onStart,
}: {
  specialty?: Specialty;
  onStart: () => void;
}) {
  const { questions, specialties, getQ, day } = useCatalog();

  const { t, language } = useI18n();

  const { state, update } = useStore();
  const c = useTheme();
  const [ids, setIds] = useState<Specialty[]>(
    specialty ? [specialty] : state.preferences.specialties,
  );
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState("toutes");
  const [mode, setMode] = useState<Session["mode"]>("learning");
  const [timed, setTimed] = useState(false);
  const [level, setLevel] = useState(state.preferences.level);
  const [goal, setGoal] = useState(state.preferences.dailyGoal);
  const [error, setError] = useState("");
  const available = questions.filter(
    (q) =>
      ids.includes(q.specialty) &&
      (difficulty === "toutes" || difficulty === q.difficulty),
  ).length;
  const start = () => {
    if (state.active) {
      onStart();
      return;
    }
    try {
      const active = createSession(questions, {
        specialties: ids,
        difficulty,
        type: "clinique",
        count,
        mode,
        timerMinutes:
          mode === "exam" && timed
            ? Math.ceil(Math.min(count, available) * 1.5)
            : null,
      });
      update((s) => ({
        ...s,
        active,
        preferences: {
          ...s.preferences,
          specialties: ids,
          level,
          dailyGoal: goal,
        },
      }));
      onStart();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  if (state.active)
    return (
      <View style={{ gap: 18 }}>
        <Txt>
          {t(
            "Une session est déjà en cours. Reprenez-la pour conserver vos réponses.",
          )}
        </Txt>
        <Button label={t("Reprendre ma session")} onPress={onStart} />
      </View>
    );
  return (
    <View style={{ gap: 22 }}>
      <Txt muted>
        {t(
          "Quelques choix pour adapter votre séance. Aucun compte nécessaire.",
        )}
      </Txt>
      <Field label={t("Votre niveau")}>
        {["Début de clinique", "Externat", "Internat"].map((v) => (
          <Chip
            key={v}
            label={t(v)}
            selected={level === v}
            onPress={() => setLevel(v)}
          />
        ))}
      </Field>
      <Field label={t("Spécialités")}>
        {specialties.map((s) => (
          <Chip
            key={s.id}
            label={t(s.name)}
            selected={ids.includes(s.id)}
            onPress={() =>
              setIds(
                ids.includes(s.id)
                  ? ids.filter((id) => id !== s.id)
                  : [...ids, s.id],
              )
            }
          />
        ))}
      </Field>
      <Field label={t("Difficulté")}>
        {[
          ["toutes", "Toutes"],
          ["débutant", "Débutant"],
          ["intermédiaire", "Intermédiaire"],
        ].map(([id, label]) => (
          <Chip
            key={id}
            label={t(label!)}
            selected={difficulty === id}
            onPress={() => setDifficulty(id!)}
          />
        ))}
      </Field>
      <Field label={t("Type de question")}>
        <Chip label={t("Vignette clinique")} selected />
        <Txt muted style={{ fontSize: 11 }}>
          {t("Visuel et mixte : en attente d’images sous licence.")}
        </Txt>
      </Field>
      <Field label={t("Longueur de session")}>
        {[5, 10, 20].map((n) => (
          <Chip
            key={n}
            label={t("{0} questions", { 0: n })}
            selected={count === n}
            onPress={() => setCount(n)}
          />
        ))}
      </Field>
      <Field label={t("Mode")}>
        {[
          ["learning", "Apprentissage · correction immédiate"],
          ["exam", "Examen · correction à la fin"],
        ].map(([id, label]) => (
          <Chip
            key={id}
            label={t(label!)}
            selected={mode === id}
            onPress={() => setMode(id as Session["mode"])}
          />
        ))}
      </Field>
      {mode === "exam" && (
        <View style={row}>
          <Switch
            accessibilityLabel={t("Chronométrer l’examen")}
            value={timed}
            onValueChange={setTimed}
            trackColor={{ true: c.accent }}
          />
          <Txt>{t("Chronomètre · 90 secondes par question")}</Txt>
        </View>
      )}
      <Field label={t("Objectif quotidien")}>
        {[5, 10, 20].map((n) => (
          <Chip
            key={n}
            label={t("{0} questions / jour", { 0: n })}
            selected={goal === n}
            onPress={() => setGoal(n)}
          />
        ))}
      </Field>
      <View style={{ padding: 14, borderRadius: 10, backgroundColor: c.soft }}>
        <Txt style={{ fontSize: 12 }}>
          {available === 0
            ? "Sélectionnez au moins une spécialité."
            : available < count
              ? t(
                  "{0} questions disponibles : la session sera adaptée, sans répétition.",
                  { 0: available },
                )
              : t("{0} questions distinctes · environ {1} minutes", {
                  0: count,
                  1: Math.ceil(Math.min(count, available) * 1.5),
                })}
        </Txt>
      </View>
      <Txt muted style={{ fontSize: 11 }}>
        {t(
          "Cas fictifs de démonstration, non validés médicalement. Ces QCM ne constituent pas une référence clinique.",
        )}
      </Txt>
      {!!error && <Txt style={{ color: c.error }}>{error}</Txt>}
      <Button
        label={t("C’est parti")}
        disabled={available === 0}
        icon={Play}
        onPress={start}
      />
    </View>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 10 }}>
      <Txt style={{ fontWeight: "600", fontSize: 13 }}>{label}</Txt>
      <View style={wrap}>{children}</View>
    </View>
  );
}

function Quiz({
  close,
  complete,
}: {
  close: () => void;
  complete: (s: Session) => void;
}) {
  const { questions, specialties, getQ, day } = useCatalog();

  const { t, language } = useI18n();

  const { state, update } = useStore();
  const c = useTheme();
  const session = state.active;
  const q = session ? getQ(session.questionIds[session.index]!) : null;
  const [choice, setChoice] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<Confidence>("moyenne");
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    setChoice(null);
    setConfidence("moyenne");
  }, [q?.id]);
  const end = () => {
    if (!session) return;
    const ended = { ...session, finishedAt: new Date().toISOString() };
    update((s) => finishSession(s));
    complete(ended);
  };
  const remaining = session?.timerMinutes
    ? Math.max(
        0,
        session.timerMinutes * 60 -
          Math.floor((now - Date.parse(session.startedAt)) / 1000),
      )
    : null;
  useEffect(() => {
    if (!session?.timerMinutes) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [session?.id]);
  useEffect(() => {
    if (remaining === 0) end();
  }, [remaining]);
  if (!session || !q) return null;
  const answered = session.answers[q.id];
  const showCorrection = !!answered && session.mode === "learning";
  const next = () => {
    if (session.index + 1 === session.questionIds.length) {
      end();
    } else
      update((s) => ({
        ...s,
        active: s.active ? { ...s.active, index: s.active.index + 1 } : null,
      }));
  };
  return (
    <View style={{ flex: 1 }}>
      <View
        style={[
          row,
          {
            padding: 18,
            borderBottomWidth: 1,
            borderColor: c.line,
            backgroundColor: c.card,
            justifyContent: "space-between",
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          onPress={close}
          style={[row, { padding: 8 }]}
        >
          <ChevronLeft color={c.text} size={19} />
          <Txt style={{ fontSize: 12 }}>
            {t("Quitter et reprendre plus tard")}
          </Txt>
        </Pressable>
        <Txt muted style={{ fontSize: 12 }}>
          {session.mode === "exam" ? "Examen" : "Apprentissage"}
          {remaining !== null
            ? ` · ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
            : ""}
        </Txt>
      </View>
      <ScrollView
        contentContainerStyle={{
          padding: 24,
          paddingBottom: 50,
          maxWidth: 800,
          width: "100%",
          alignSelf: "center",
          gap: 20,
        }}
      >
        <View style={[row, { justifyContent: "space-between" }]}>
          <Txt style={{ fontSize: 12, fontWeight: "600" }}>
            {t("Question {0} sur {1}", {
              0: session.index + 1,
              1: session.questionIds.length,
            })}
          </Txt>
          <Txt muted style={{ fontSize: 11 }}>
            {t("Démonstration · non relue")}
          </Txt>
        </View>
        <Bar
          value={
            ((session.index + (answered ? 1 : 0)) /
              session.questionIds.length) *
            100
          }
        />
        <View style={wrap}>
          <Chip
            label={t(specialties.find((s) => s.id === q.specialty)!.name)}
          />
          <Chip label={t(q.theme)} />
          <Chip label={t(q.difficulty)} />
        </View>
        <Card style={{ gap: 16 }}>
          <Txt muted style={{ fontSize: 10, letterSpacing: 1 }}>
            {t("VIGNETTE CLINIQUE · CAS FICTIF")}
          </Txt>
          <Txt style={{ fontSize: 17, lineHeight: 29 }}>{q.context}</Txt>
          <Title style={{ fontSize: 20, lineHeight: 29 }}>{q.title}</Title>
        </Card>
        <View style={{ gap: 10 }}>
          {q.options.map((o, i) => {
            const selected = answered ? answered.choice === i : choice === i;
            const right = showCorrection && i === q.correct;
            const wrong = showCorrection && selected && i !== q.correct;
            return (
              <Pressable
                key={o.label}
                accessibilityRole="radio"
                aria-checked={selected}
                accessibilityState={{ checked: selected, disabled: !!answered }}
                disabled={!!answered}
                onPress={() => setChoice(i)}
                style={{
                  padding: 17,
                  borderRadius: 12,
                  borderWidth: selected || right ? 2 : 1,
                  borderColor: right
                    ? c.accent
                    : wrong
                      ? c.error
                      : selected
                        ? c.accent
                        : c.line,
                  backgroundColor: right ? c.soft : wrong ? c.errorBg : c.card,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    backgroundColor: selected ? c.accent : c.bg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Txt
                    style={{
                      color: selected ? "#fff" : c.muted,
                      fontWeight: "600",
                    }}
                  >
                    {String.fromCharCode(65 + i)}
                  </Txt>
                </View>
                <Txt style={{ flex: 1, fontWeight: selected ? "600" : "400" }}>
                  {o.label}
                </Txt>
                {right && <Check size={18} color={c.accent} />}{" "}
                {wrong && <X size={18} color={c.error} />}
              </Pressable>
            );
          })}
        </View>
        {!answered && (
          <>
            <Field
              label={t("À quel point êtes-vous sûr·e de votre raisonnement ?")}
            >
              {[
                ["fragile", "Je doute"],
                ["moyenne", "Assez sûr·e"],
                ["solide", "Je peux l’expliquer"],
              ].map(([id, label]) => (
                <Chip
                  key={id}
                  label={t(label!)}
                  selected={confidence === id}
                  onPress={() => setConfidence(id as Confidence)}
                />
              ))}
            </Field>
            <Button
              label={t(
                session.mode === "exam"
                  ? "Enregistrer ma réponse"
                  : "Valider ma réponse",
              )}
              disabled={choice === null}
              icon={Check}
              onPress={() => {
                if (choice !== null)
                  update((s) => recordAnswer(s, q, choice, confidence));
              }}
            />
          </>
        )}
        {answered && session.mode === "exam" && (
          <Txt style={{ color: c.accent }}>
            {t("Réponse enregistrée. Le corrigé sera disponible à la fin.")}
          </Txt>
        )}
        {showCorrection && <Correction question={q} choice={answered.choice} />}
        <View
          style={[row, { justifyContent: "space-between", flexWrap: "wrap" }]}
        >
          <MarkButton question={q} />
          {answered && (
            <Button
              label={t(
                session.index + 1 === session.questionIds.length
                  ? "Voir mon bilan"
                  : "Question suivante",
              )}
              onPress={next}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function MarkButton({ question }: { question: Question }) {
  const { state, update } = useStore();
  const c = useTheme();
  const marked = state.marked.includes(question.id);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: marked }}
      onPress={() =>
        update((s) => ({
          ...s,
          marked: marked
            ? s.marked.filter((id) => id !== question.id)
            : [...s.marked, question.id],
        }))
      }
      style={[row, { padding: 12 }]}
    >
      <Bookmark size={17} color={c.accent} fill={marked ? c.accent : "none"} />
      <Txt style={{ fontSize: 12, color: c.accent }}>
        {marked ? "Ajoutée aux révisions" : "À revoir"}
      </Txt>
    </Pressable>
  );
}

function Correction({
  question: q,
  choice,
}: {
  question: Question;
  choice?: number;
}) {
  const { day } = useCatalog();
  const { t, language } = useI18n();

  const { state, update } = useStore();
  const c = useTheme();
  const [report, setReport] = useState(false);
  const [reason, setReason] = useState("");
  const [sent, setSent] = useState(false);
  const favorite = state.favorites.includes(q.id);
  return (
    <View style={{ gap: 19 }}>
      <Card style={{ backgroundColor: c.soft, gap: 9 }}>
        <View style={row}>
          <Check color={c.accent} size={21} />
          <Txt style={{ color: c.accent, fontWeight: "700" }}>
            {choice === undefined
              ? "Bonne réponse"
              : choice === q.correct
                ? "Bonne réponse, continuez ainsi"
                : "Une occasion de comprendre"}
          </Txt>
        </View>
        <Title style={{ fontSize: 23 }}>{q.options[q.correct]!.label}</Title>
        <Txt>{q.reasoning}</Txt>
      </Card>
      <View>
        <Txt style={{ fontWeight: "700", marginBottom: 9 }}>
          {t("Les indices qui font la différence")}
        </Txt>
        <View style={wrap}>
          {q.clues.map((clue) => (
            <Chip key={clue} label={t(clue)} />
          ))}
        </View>
      </View>
      <View style={{ gap: 12 }}>
        <Txt style={{ fontWeight: "700" }}>
          {t("Pourquoi les autres propositions conviennent moins")}
        </Txt>
        {q.options
          .filter((_, i) => i !== q.correct)
          .map((o) => (
            <View
              key={o.label}
              style={{
                borderLeftWidth: 2,
                borderColor: c.line,
                paddingLeft: 14,
              }}
            >
              <Txt style={{ fontWeight: "600", fontSize: 13 }}>{o.label}</Txt>
              <Txt muted style={{ fontSize: 12, lineHeight: 21 }}>
                {o.explanation}
              </Txt>
            </View>
          ))}
      </View>
      <Card style={{ backgroundColor: c.yellow, gap: 7 }}>
        <View style={row}>
          <Lightbulb size={18} color="#967332" />
          <Txt style={{ fontWeight: "700" }}>{t("À retenir")}</Txt>
        </View>
        <Txt>{q.takeaway}</Txt>
      </Card>
      <Txt muted style={{ fontSize: 12 }}>
        {t("Objectif : {0}", { 0: q.objective })}
      </Txt>
      <View style={{ gap: 6 }}>
        <Txt style={{ fontWeight: "600", fontSize: 12 }}>
          {t("Ressources pour la relecture médicale")}
        </Txt>
        {q.sources.map((s) => (
          <Pressable
            key={s.url}
            accessibilityRole="link"
            onPress={() => Linking.openURL(s.url)}
          >
            <Txt
              style={{
                fontSize: 12,
                color: c.accent,
                textDecorationLine: "underline",
              }}
            >
              {s.title} ↗
            </Txt>
          </Pressable>
        ))}
        <Txt muted style={{ fontSize: 10 }}>
          {t(
            "Version {0} · Rédaction : {1} 2026 · Relecture médicale : non réalisée",
            { 0: q.version, 1: day(q.editorialDate) },
          )}
        </Txt>
        <Txt muted style={{ fontSize: 10 }}>
          {t(
            "Ces ressources générales ne constituent pas une validation de ce QCM. Démonstration uniquement.",
          )}
        </Txt>
      </View>
      <View style={[wrap, { alignItems: "center" }]}>
        <Button
          small
          secondary
          label={t(favorite ? "Retirer des favoris" : "Garder en favori")}
          icon={Bookmark}
          onPress={() =>
            update((s) => ({
              ...s,
              favorites: favorite
                ? s.favorites.filter((id) => id !== q.id)
                : [...s.favorites, q.id],
            }))
          }
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => setReport(!report)}
          style={[row, { padding: 10 }]}
        >
          <Flag size={15} color={c.muted} />
          <Txt muted style={{ fontSize: 11 }}>
            {t("Signaler une ambiguïté")}
          </Txt>
        </Pressable>
      </View>
      {report && (
        <Card style={{ gap: 12 }}>
          <Txt style={{ fontWeight: "600" }}>
            {t("Qu’est-ce qui vous semble incorrect ?")}
          </Txt>
          <TextInput
            accessibilityLabel={t("Description du signalement")}
            value={reason}
            onChangeText={setReason}
            multiline
            maxLength={2000}
            placeholder={t("Décrivez l’erreur, sans donnée de patient…")}
            placeholderTextColor={c.muted}
            style={{
              color: c.text,
              borderWidth: 1,
              borderColor: c.line,
              borderRadius: 9,
              padding: 14,
              minHeight: 90,
              textAlignVertical: "top",
            }}
          />
          <Button
            small
            label={t("Enregistrer le signalement")}
            disabled={!reason.trim() || sent}
            icon={Flag}
            onPress={() => {
              update((s) => ({
                ...s,
                reports: [
                  ...s.reports,
                  {
                    id: uid(),
                    questionId: q.id,
                    version: q.version,
                    reason: reason.trim(),
                    at: new Date().toISOString(),
                  },
                ],
              }));
              setSent(true);
            }}
          />
          <Txt muted style={{ fontSize: 11 }}>
            {sent
              ? "Signalement enregistré avec votre progression. Il sera inclus dans votre export."
              : "Aucun service éditorial ne traite encore ces signalements. Ils sont conservés avec votre progression et inclus dans votre export."}
          </Txt>
        </Card>
      )}
    </View>
  );
}

function Result({
  session,
  openCorrection,
  revise,
}: {
  session: Session;
  openCorrection: (q: Question, choice?: number) => void;
  revise: () => void;
}) {
  const { questions, specialties, getQ, day } = useCatalog();

  const { t, language } = useI18n();

  const c = useTheme();
  const answered = Object.keys(session.answers).length;
  const success = score(session, questions);
  return (
    <View style={{ gap: 21 }}>
      <View style={{ alignItems: "center", gap: 9, paddingVertical: 12 }}>
        <View
          style={{ padding: 19, borderRadius: 40, backgroundColor: c.soft }}
        >
          <GraduationCap size={35} color={c.accent} />
        </View>
        <Title style={{ fontSize: 27 }}>
          {t("Un pas de plus dans votre apprentissage.")}
        </Title>
        <Txt
          style={{
            fontSize: 35,
            fontWeight: "700",
            lineHeight: 45,
            color: c.accent,
          }}
        >
          {success} / {session.questionIds.length}
        </Txt>
        <Txt muted>
          {t("{0} réponse{1} enregistrée{2} · {3} non répondue{4}", {
            0: answered,
            1: answered > 1 ? "s" : "",
            2: answered > 1 ? "s" : "",
            3: session.questionIds.length - answered,
            4: session.questionIds.length - answered > 1 ? "s" : "",
          })}
        </Txt>
        <Txt muted style={{ fontSize: 12, textAlign: "center" }}>
          {t(
            "Ce résultat mesure votre réussite à ces QCM, pas votre compétence clinique.",
          )}
        </Txt>
      </View>
      <Button
        label={t("Retrouver mes révisions")}
        icon={RotateCcw}
        onPress={revise}
      />
      <Txt style={{ fontWeight: "700" }}>
        {t("Revenir sur les raisonnements")}
      </Txt>
      {session.questionIds.map((id, i) => {
        const q = getQ(id);
        const a = session.answers[id];
        return (
          <Pressable
            key={id}
            accessibilityRole="button"
            disabled={!a}
            onPress={() => openCorrection(q, a?.choice)}
            style={{
              padding: 16,
              backgroundColor: c.card,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: c.line,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            {a?.choice === q.correct ? (
              <Check size={17} color={c.accent} />
            ) : (
              <X size={17} color={c.error} />
            )}
            <View style={{ flex: 1 }}>
              <Txt style={{ fontSize: 13, fontWeight: "600" }}>
                {i + 1}. {q.theme}
              </Txt>
              <Txt muted style={{ fontSize: 11 }}>
                {a
                  ? t("{0} · Consulter le corrigé", {
                      0: a.choice === q.correct ? "Réussi" : "À consolider",
                    })
                  : "Non répondue"}
              </Txt>
            </View>
            <ChevronRight size={17} color={c.muted} />
          </Pressable>
        );
      })}
    </View>
  );
}

function RevisionScreen({
  startReview,
  openCorrection,
  openConfig,
}: {
  startReview: () => void;
  openCorrection: (q: Question) => void;
  openConfig: () => void;
}) {
  const { questions, specialties, getQ, day } = useCatalog();

  const { t, language } = useI18n();

  const { state } = useStore();
  const c = useTheme();
  const [filter, setFilter] = useState("erreurs");
  const due = dueIds(state);
  const latest = new Map(state.attempts.map((a) => [a.questionId, a]));
  const ids =
    filter === "favoris"
      ? state.favorites
      : filter === "marquées"
        ? state.marked
        : [...latest.values()]
            .filter((a) => !a.correct)
            .map((a) => a.questionId);
  return (
    <>
      <PageHeading
        eyebrow={t("CONSOLIDER LES ACQUIS")}
        title={t("Ce qui mérite un deuxième regard")}
        description={t(
          "Revenez au bon moment sur les notions qui vous demandent encore un effort.",
        )}
      />
      <Card style={{ backgroundColor: c.hero, gap: 14 }}>
        <View style={row}>
          <RotateCcw color={c.accent} size={24} />
          <Title style={{ fontSize: 23 }}>{t("Mes révisions du jour")}</Title>
        </View>
        <Txt>
          {due.length
            ? t(
                "{0} question{1} à revoir : une échéance atteinte ou une notion que vous avez marquée.",
                { 0: due.length, 1: due.length > 1 ? "s" : "" },
              )
            : "Aucune révision échue. Une nouvelle erreur sera à revoir demain ; vous pouvez aussi marquer une question « À revoir »."}
        </Txt>
        <Button
          label={t(
            state.active
              ? "Reprendre la session en cours"
              : "Lancer mes révisions",
          )}
          disabled={!due.length && !state.active}
          onPress={startReview}
        />
      </Card>
      <View style={wrap}>
        {[
          ["erreurs", "Carnet d’erreurs"],
          ["favoris", "Favoris"],
          ["marquées", "À revoir"],
        ].map(([id, label]) => (
          <Chip
            key={id}
            label={t(label!)}
            selected={filter === id}
            onPress={() => setFilter(id!)}
          />
        ))}
      </View>
      {!ids.length ? (
        <Empty
          title={t(
            filter === "erreurs"
              ? "Votre carnet attend ses premiers déclics"
              : "Aucune question enregistrée",
          )}
          description={t(
            filter === "erreurs"
              ? "Les dernières réponses incorrectes apparaîtront ici. Une réussite ultérieure retire la question de ce carnet."
              : "Utilisez les boutons Favori et À revoir pendant votre apprentissage.",
          )}
          action={
            <Button small label={t("Explorer un quiz")} onPress={openConfig} />
          }
        />
      ) : (
        ids.map((id) => {
          const q = getQ(id);
          if (!q) return null;
          const rev = state.reviews[id];
          const locked =
            state.active?.mode === "exam" &&
            state.active.questionIds.includes(id);
          return (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityState={{ disabled: locked }}
              disabled={locked}
              onPress={() => openCorrection(q)}
            >
              <Card style={{ gap: 8 }}>
                <View style={[row, { justifyContent: "space-between" }]}>
                  <Txt style={{ fontWeight: "700" }}>{q.theme}</Txt>
                  <BookOpen color={c.accent} size={18} />
                </View>
                <Txt muted style={{ fontSize: 12 }}>
                  {q.context.slice(0, 135)}…
                </Txt>
                <Txt style={{ fontSize: 11, color: c.accent }}>
                  {locked
                    ? "Corrigé disponible à la fin de l’examen en cours"
                    : "Consulter le corrigé"}
                  {rev
                    ? t(" · Prochaine révision : {0}", { 0: day(rev.due) })
                    : ""}
                </Txt>
              </Card>
            </Pressable>
          );
        })
      )}
      <Txt muted style={{ fontSize: 11 }}>
        {t(
          "Pourquoi ces recommandations ? Une erreur ou une confiance fragile déclenche une révision à J+1. Les intervalles augmentent avec les réponses justes et la confiance. Les questions marquées sont proposées immédiatement.",
        )}
      </Txt>
    </>
  );
}

function ProgressScreen({
  openSession,
}: {
  openSession: (s: Session) => void;
}) {
  const { questions, specialties, getQ, day } = useCatalog();

  const { t, language } = useI18n();

  const { state } = useStore();
  const c = useTheme();
  const fresh = state.attempts.filter((a) => !a.repeated);
  const repeated = state.attempts.filter((a) => a.repeated);
  const week = state.attempts.filter(
    (a) => Date.parse(a.at) >= Date.now() - 7 * 86400000,
  );
  return (
    <>
      <PageHeading
        eyebrow={t("OBSERVER SON APPRENTISSAGE")}
        title={t("Des repères pour avancer")}
        description={t(
          "Distinguez la découverte d’une notion de la mémorisation d’une réponse.",
        )}
      />
      <View style={wrap}>
        {[
          { label: "Questions nouvelles", a: fresh },
          { label: "Questions répétées", a: repeated },
        ].map(({ label, a }) => (
          <Card key={label} style={{ flex: 1, minWidth: 220, gap: 9 }}>
            <Txt muted>{label}</Txt>
            <Title>{a.length ? `${accuracy(a)} %` : "—"}</Title>
            <Txt muted style={{ fontSize: 12 }}>
              {t("{0} tentative{1} · {2} réponse{3} juste{4}", {
                0: a.length,
                1: a.length > 1 ? "s" : "",
                2: a.filter((x) => x.correct).length,
                3: a.filter((x) => x.correct).length > 1 ? "s" : "",
                4: a.filter((x) => x.correct).length > 1 ? "s" : "",
              })}
            </Txt>
          </Card>
        ))}
      </View>
      <Card style={{ gap: 14 }}>
        <Title style={{ fontSize: 20 }}>{t("Les 7 derniers jours")}</Title>
        <Txt>
          {t(
            "{0} tentatives · {1} questions distinctes · {2} sessions de révision terminées",
            {
              0: week.length,
              1: new Set(week.map((a) => a.questionId)).size,
              2: state.sessions.filter(
                (s) =>
                  s.kind === "review" &&
                  Date.parse(s.finishedAt!) > Date.now() - 7 * 86400000,
              ).length,
            },
          )}
        </Txt>
        <Txt muted style={{ fontSize: 11 }}>
          {t(
            "Données réelles de cet appareil sur des cas de démonstration. Un petit échantillon ne permet pas de conclure à une progression clinique.",
          )}
        </Txt>
      </Card>
      <Title style={{ fontSize: 21 }}>{t("Par spécialité et par thème")}</Title>
      {specialties.map((s) => {
        const attempts = state.attempts.filter(
          (a) => getQ(a.questionId)?.specialty === s.id,
        );
        const count = new Set(attempts.map((a) => a.questionId)).size;
        return (
          <Card key={s.id} style={{ gap: 14 }}>
            <View style={[row, { justifyContent: "space-between" }]}>
              <Txt style={{ fontWeight: "700" }}>{s.name}</Txt>
              <Txt muted style={{ fontSize: 12 }}>
                {t("{0} / 10 explorées", { 0: count })}
              </Txt>
            </View>
            <Bar value={count * 10} color={s.color} />
            {[
              ...new Set(
                questions
                  .filter((q) => q.specialty === s.id)
                  .map((q) => q.theme),
              ),
            ].map((theme) => {
              const a = attempts.filter(
                (a) => getQ(a.questionId)?.theme === theme,
              );
              return (
                <View
                  key={theme}
                  style={[row, { justifyContent: "space-between" }]}
                >
                  <Txt muted style={{ fontSize: 12 }}>
                    {theme}
                  </Txt>
                  <Txt style={{ fontSize: 12 }}>
                    {a.length
                      ? t("{0}/{1} réponses justes", {
                          0: a.filter((x) => x.correct).length,
                          1: a.length,
                        })
                      : "À découvrir"}
                  </Txt>
                </View>
              );
            })}
          </Card>
        );
      })}
      <Title style={{ fontSize: 21 }}>{t("Historique des sessions")}</Title>
      {!state.sessions.length ? (
        <Empty
          title={t("Votre histoire commence ici")}
          description={t(
            "Les sessions terminées seront conservées avec leurs corrections.",
          )}
        />
      ) : (
        [...state.sessions].reverse().map((s) => (
          <Pressable
            key={s.id}
            accessibilityRole="button"
            onPress={() => openSession(s)}
          >
            <Card
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View>
                <Txt style={{ fontWeight: "600" }}>
                  {t("{0} · {1} questions", {
                    0:
                      s.kind === "review"
                        ? "Révision"
                        : s.mode === "exam"
                          ? "Examen"
                          : "Apprentissage",
                    1: s.questionIds.length,
                  })}
                </Txt>
                <Txt muted style={{ fontSize: 11 }}>
                  {t("{0} · {1} réponses justes", {
                    0: day(s.finishedAt!),
                    1: score(s, questions),
                  })}
                </Txt>
              </View>
              <ChevronRight color={c.accent} size={18} />
            </Card>
          </Pressable>
        ))
      )}
    </>
  );
}

function ProfileScreen({
  notice,
  premium,
}: {
  notice: (s: string) => void;
  premium: () => void;
}) {
  const { t, language } = useI18n();

  const { state, update } = useStore();
  const c = useTheme();
  const [confirm, setConfirm] = useState(false);
  const exportData = async () => {
    const text = JSON.stringify(state, null, 2);
    try {
      if (Platform.OS === "web") {
        const blob = new Blob([text], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "medquiz-donnees.json";
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({ message: text, title: "Mes données MedQuiz" });
      }
      notice(
        "Export préparé. Vos données incluent les signalements enregistrés localement.",
      );
    } catch {
      notice("L’export n’a pas abouti. Réessayez depuis cet appareil.");
    }
  };
  return (
    <>
      <PageHeading
        eyebrow={t("VOTRE ESPACE")}
        title={t("Un apprentissage à votre image")}
        description={t(
          "Réglez votre confort de lecture et gardez le contrôle de vos données.",
        )}
      />
      <AccountPanel />
      <SubscriptionPanel />
      <DeleteAccountPanel />
      <Card style={{ gap: 19 }}>
        <Field label={t("Langue de l’application")}>
          <LanguageSwitch />
        </Field>
        <Title style={{ fontSize: 20 }}>{t("Confort et objectifs")}</Title>
        {[
          { label: "Mode sombre", key: "dark" as const },
          { label: "Texte plus grand", key: "largeText" as const },
        ].map((p) => (
          <View key={p.key} style={[row, { justifyContent: "space-between" }]}>
            <Txt>{p.label}</Txt>
            <Switch
              accessibilityLabel={t(p.label)}
              value={state.preferences[p.key]}
              onValueChange={(v) =>
                update((s) => ({
                  ...s,
                  preferences: { ...s.preferences, [p.key]: v },
                }))
              }
              trackColor={{ true: c.accent }}
            />
          </View>
        ))}
        <Field label={t("Objectif quotidien")}>
          {[5, 10, 20].map((n) => (
            <Chip
              key={n}
              label={t("{0} questions", { 0: n })}
              selected={state.preferences.dailyGoal === n}
              onPress={() =>
                update((s) => ({
                  ...s,
                  preferences: { ...s.preferences, dailyGoal: n },
                }))
              }
            />
          ))}
        </Field>
        <Txt muted style={{ fontSize: 12 }}>
          {t(
            "Aucun rappel ni notification n’est envoyé dans cette version. Aucun suivi publicitaire ni service d’analyse distant n’est actif.",
          )}
        </Txt>
      </Card>
      <Card style={{ gap: 15 }}>
        <Title style={{ fontSize: 20 }}>{t("Votre offre")}</Title>
        <Txt>
          {t(
            "Découverte gratuite : tous les cas de démonstration, corrections complètes et progression sauvegardée.",
          )}
        </Txt>
        <Button
          secondary
          label={t("Découvrir le projet Premium")}
          icon={Sparkles}
          onPress={premium}
        />
      </Card>
      <Card style={{ gap: 16 }}>
        <Title style={{ fontSize: 20 }}>
          {t("Vos données vous appartiennent")}
        </Title>
        <Button
          secondary
          label={t("Exporter mes données")}
          icon={Download}
          onPress={exportData}
        />
        {!confirm ? (
          <Button
            secondary
            label={t("Effacer mes données locales")}
            icon={Trash2}
            onPress={() => setConfirm(true)}
          />
        ) : (
          <View style={{ gap: 12 }}>
            <Txt style={{ color: c.error }}>
              {t(
                "Cette action efface les réponses, les favoris et les préférences de cet appareil. Exportez vos données avant de continuer.",
              )}
            </Txt>
            <Button
              label={t("Confirmer l’effacement")}
              icon={Trash2}
              onPress={() => {
                update(() => ({
                  ...initialState,
                  preferences: { ...initialState.preferences },
                }));
                setConfirm(false);
                notice("Vos données locales ont été effacées.");
              }}
            />
            <Button
              secondary
              label={t("Conserver mes données")}
              icon={X}
              onPress={() => setConfirm(false)}
            />
          </View>
        )}
      </Card>
      <Txt muted style={{ fontSize: 11 }}>
        {t(
          "MedQuiz 0.1 · Français · Application de formation, sans diagnostic personnalisé. Les contenus de démonstration nécessitent une relecture médicale avant toute publication commerciale.",
        )}
      </Txt>
    </>
  );
}
