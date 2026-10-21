import React, { useEffect, useRef, useState } from "react";
import { Platform, Share, TextInput, View } from "react-native";
import { Users, Timer, Copy, RefreshCw } from "lucide-react-native";
import { useAuth } from "../auth";
import { useStore } from "../state";
import { useI18n } from "../i18n";
import {
  competitive,
  competitiveRank,
  competitiveRequestId,
  CompetitiveError,
  type CompetitiveMatch,
  type CompetitiveMode,
  type CompetitiveProfile,
  type CompetitiveRecent,
  type Leaderboard,
} from "../services/competitive";
import { Button, Card, Chip, Title, Txt } from "./components";
import { useTheme } from "./theme";
import { QuestionFigure } from "./anatomy-vector";

export function CompetitivePanel({ onSignIn }: { onSignIn?: () => void }) {
  const { update } = useStore();
  const { user } = useAuth();
  const { language } = useI18n();
  const c = useTheme();
  const en = language === "en";
  const l = (fr: string, english: string) => (en ? english : fr);
  const [profile, setProfile] = useState<CompetitiveProfile | null>(null);
  const [nickname, setNickname] = useState("");
  const [year, setYear] = useState(1);
  const [boardYear, setBoardYear] = useState(1);
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [recent, setRecent] = useState<CompetitiveRecent[]>([]);
  const [match, setMatch] = useState<CompetitiveMatch | null>(null);
  const [mode, setMode] = useState<CompetitiveMode>("duel");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(Date.now());
  const busyRef = useRef(false);
  const alive = useRef(true);
  const requestId = useRef<string | null>(null);
  const sequence = useRef(0);
  const applied = useRef(0);
  const offset = useRef(0);
  const inputStyle = {
    color: c.text,
    borderColor: c.line,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    minHeight: 48,
    fontSize: 15,
  };

  const errorMessage = (error: unknown) => {
    const key = error instanceof CompetitiveError ? error.code : "unavailable";
    const errors: Record<string, [string, string]> = {
      daily_limit: [
        "Les 3 sessions gratuites du jour sont utilisées. Revenez demain ou passez à Premium.",
        "You have used today's 3 free sessions. Come back tomorrow or upgrade to Premium.",
      ],
      question_limit: [
        "Cette partie dépasse la limite de votre formule.",
        "This match exceeds your plan's limit.",
      ],
      invalid_profile: [
        "Choisissez un pseudonyme de 3 à 24 lettres, chiffres, espaces, points ou tirets.",
        "Choose a nickname of 3–24 letters, numbers, spaces, dots or dashes.",
      ],
      study_year_locked: [
        "L’année d’étude reste fixe après la première partie de la saison et pendant une invitation ouverte.",
        "Your study year stays fixed after your first match of the season and while an invitation is open.",
      ],
      study_year_mismatch: [
        "Cette invitation est réservée aux joueurs de la même année d’étude.",
        "This invitation is for players in the same study year.",
      ],
      profile_required: [
        "Enregistrez votre profil compétitif avant de participer.",
        "Save your competitive profile before joining.",
      ],
      invalid_invitation: [
        "Ce code d’invitation est introuvable.",
        "This invitation code was not found.",
      ],
      invitation_closed: [
        "Cette invitation a expiré ou la partie a déjà commencé.",
        "This invitation has expired or the match has already started.",
      ],
      lobby_full: [
        "Cette partie accueille déjà deux joueurs.",
        "This match already has two players.",
      ],
      active_match_exists: [
        "Reprenez ou quittez votre invitation actuelle avant d’en rejoindre une autre.",
        "Resume or leave your current invitation before joining another.",
      ],
      match_not_found: [
        "Cette partie n’est plus accessible à votre compte.",
        "This match is no longer available to your account.",
      ],
      second_player_required: [
        "Attendez qu’un deuxième joueur rejoigne la partie.",
        "Wait for a second player to join.",
      ],
      match_not_started: [
        "Le départ n’a pas encore été donné.",
        "The match has not started yet.",
      ],
      answer_out_of_order: [
        "La question a changé. Actualisez la partie.",
        "The question has changed. Refresh the match.",
      ],
      question_bank_unavailable: [
        "La banque compétitive est temporairement indisponible.",
        "The competitive question bank is temporarily unavailable.",
      ],
      unavailable: [
        "Connexion au mode compétitif impossible. Réessayez sans fermer votre partie.",
        "Could not connect to competitive mode. Retry without closing your match.",
      ],
    };
    const pair = errors[key] ?? errors.unavailable!;
    return en ? pair[1] : pair[0];
  };
  const applyMatch = (value: CompetitiveMatch, order: number) => {
    if (!alive.current || order < applied.current) return;
    applied.current = order;
    offset.current = Date.parse(value.serverNow) - Date.now();
    setMatch(value);
    if (value.activity?.length) update((state) => {
      const existing = new Set((state.studyEvents ?? []).map((event) => event.id));
      const added = value.activity!.filter((event) => Number.isInteger(event.ordinal) && event.ordinal >= 0 && event.ordinal < 10 && Number.isFinite(Date.parse(event.at)))
        .map((event) => ({ id: `competitive:${value.id}:${event.ordinal}`, at: event.at, source: "competition" as const }))
        .filter((event) => !existing.has(event.id));
      return added.length ? { ...state, studyEvents: [...(state.studyEvents ?? []), ...added] } : state;
    });
    setNow(Date.now());
  };
  const perform = async (work: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setMessage("");
    try {
      await work();
    } catch (error) {
      if (alive.current) setMessage(errorMessage(error));
    } finally {
      busyRef.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const refreshMatch = async (id: string) => {
    const order = ++sequence.current;
    const value = await competitive.get(id);
    applyMatch(value, order);
  };
  const refreshHome = async () => {
    const [p, r] = await Promise.all([
      competitive.profile(),
      competitive.recent(),
    ]);
    if (!alive.current) return;
    setProfile(p);
    setRecent(r);
    if (p) {
      setNickname(p.nickname);
      setYear(p.study_year);
      setBoardYear(p.study_year);
    }
  };
  useEffect(() => {
    alive.current = true;
    if (user) void perform(refreshHome);
    return () => {
      alive.current = false;
    };
  }, [user?.id]);
  useEffect(() => {
    if (!user) return;
    let active = true;
    competitive
      .leaderboard(boardYear)
      .then((value) => {
        if (active) setBoard(value);
      })
      .catch((error) => {
        if (active) setMessage(errorMessage(error));
      });
    return () => {
      active = false;
    };
  }, [user?.id, boardYear, match?.status]);
  useEffect(() => {
    if (!match || !["waiting", "playing"].includes(match.status)) return;
    let active = true;
    const interval = setInterval(
      () => {
        if (!busyRef.current)
          void refreshMatch(match.id).catch((error) => {
            if (active) setMessage(errorMessage(error));
          });
      },
      match.status === "waiting" && match.players.length < 2 ? 5000 : 2000,
    );
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [match?.id, match?.status, match?.players.length, !!match?.question]);
  useEffect(() => {
    if (match?.status !== "playing") return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [match?.status]);
  useEffect(() => {
    if (match?.status === "finished") void refreshHome().catch(() => {});
  }, [match?.status]);

  const createMatch = () =>
    perform(async () => {
      requestId.current ??= competitiveRequestId();
      const order = ++sequence.current;
      const value = await competitive.create(mode, requestId.current);
      requestId.current = null;
      applyMatch(value, order);
    });
  const seconds = match?.endsAt
    ? Math.max(
        0,
        Math.ceil((Date.parse(match.endsAt) - now - offset.current) / 1000),
      )
    : 0;
  const countdown = match?.startsAt
    ? Math.max(
        0,
        Math.ceil((Date.parse(match.startsAt) - now - offset.current) / 1000),
      )
    : 0;
  const q = match?.question?.[language];

  return (
    <View style={{ gap: 18 }}>
      <View style={{ gap: 8 }}>
        <Title>{l("Compétition", "Competition")}</Title>
        <Txt muted>
          {l(
            "Défiez un ami de la même année, partagez les mêmes 10 questions et retrouvez votre classement par année d’étude.",
            "Challenge a friend in your study year, share the same 10 questions and see your study-year leaderboard.",
          )}
        </Txt>
      </View>
      <Card style={{ gap: 8, backgroundColor: c.soft }}>
        <Txt style={{ fontWeight: "700" }}>
          {l(
            "Bêta pédagogique · classement expérimental",
            "Educational beta · experimental rankings",
          )}
        </Txt>
        <Txt>
          {l(
            "Les cas de démonstration attendent une relecture médicale. Le rang mesure les résultats du jeu et ne certifie aucune compétence clinique. Les années d’étude sont déclarées par les joueurs.",
            "The demonstration cases are awaiting medical review. Ranks describe game results and do not certify clinical competence. Study years are self-reported.",
          )}
        </Txt>
        <Txt muted>
          {l(
            "Créer ou rejoindre une partie utilise une session, même en cas d’annulation. Gratuit : 3 sessions de 10 questions maximum par jour, quiz et compétitions réunis. Premium : sessions illimitées ; chaque duel reste limité à 10 questions pour tous.",
            "Creating or joining a match uses one session, even if cancelled. Free: 3 sessions of up to 10 questions per day across quizzes and competitions. Premium: unlimited sessions; every match stays at 10 questions for everyone.",
          )}
        </Txt>
        <Txt muted>
          {l(
            "Seule la première partie terminée contre un même adversaire par jour modifie le classement. Les revanches restent possibles, sans points Elo.",
            "Only the first completed match against each opponent per day changes your ranking. Rematches remain available without Elo points.",
          )}
        </Txt>
      </Card>
      {!!message && (
        <Card>
          <Txt accessibilityRole="alert">{message}</Txt>
        </Card>
      )}
      {!user ? (
        <Card style={{ gap: 14 }}>
          <Title style={{ fontSize: 20 }}>
            {l(
              "Un compte pour jouer à deux",
              "An account for two-player games",
            )}
          </Title>
          <Txt>
            {l(
              "Connectez-vous pour inviter un ami, enregistrer votre score et apparaître au classement avec un pseudonyme.",
              "Sign in to invite a friend, save your score and join the leaderboard with a nickname.",
            )}
          </Txt>
          {onSignIn && (
            <Button
              label={l(
                "Créer un compte ou se connecter",
                "Create an account or sign in",
              )}
              onPress={onSignIn}
            />
          )}
        </Card>
      ) : (
        <>
          {!match && (
            <Card style={{ gap: 14 }}>
              <Title style={{ fontSize: 20 }}>
                {l("Mon profil compétitif", "My competitive profile")}
              </Title>
              <Txt>
                {l(
                  "Pseudonyme public · n’utilisez pas votre adresse e-mail",
                  "Public nickname · do not use your email address",
                )}
              </Txt>
              <TextInput
                accessibilityLabel={l(
                  "Pseudonyme compétitif",
                  "Competitive nickname",
                )}
                value={nickname}
                onChangeText={setNickname}
                maxLength={24}
                autoCapitalize="none"
                style={inputStyle}
              />
              <Txt>
                {l("Année d’étude déclarée", "Self-reported study year")}
              </Txt>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {Array.from({ length: 12 }, (_, index) => index + 1).map(
                  (value) => (
                    <Chip
                      key={value}
                      label={
                        value <= 6
                          ? l(`Année ${value}`, `Year ${value}`)
                          : l(
                              `Internat · année ${value}`,
                              `Residency · year ${value}`,
                            )
                      }
                      selected={year === value}
                      onPress={() => setYear(value)}
                    />
                  ),
                )}
              </View>
              <Txt muted>
                {l(
                  "L’année reste fixe après votre première partie de la saison. Le pseudonyme peut être modifié.",
                  "Your study year stays fixed after your first match of the season. Your nickname can be changed.",
                )}
              </Txt>
              <Button
                label={l(
                  "Enregistrer mon profil compétitif",
                  "Save my competitive profile",
                )}
                disabled={busy || nickname.trim().length < 3}
                onPress={() =>
                  void perform(async () => {
                    const value = await competitive.saveProfile(nickname, year);
                    if (alive.current) {
                      setProfile(value);
                      setBoardYear(value.study_year);
                      setMessage(
                        l(
                          "Profil compétitif enregistré.",
                          "Competitive profile saved.",
                        ),
                      );
                    }
                  })
                }
              />
              {profile && (
                <Txt>{`${competitiveRank(profile.rating, profile.played, en)} · ${profile.rating} Elo · ${profile.played} ${l("parties", "matches")} · ${profile.season}`}</Txt>
              )}
            </Card>
          )}
          {!match && profile && (
            <Card style={{ gap: 16 }}>
              <Title style={{ fontSize: 20 }}>
                {l("Inviter un ami", "Invite a friend")}
              </Title>
              <View style={{ gap: 8 }}>
                <Button
                  secondary={mode !== "duel"}
                  label={l(
                    "Duel chronométré · 3 minutes",
                    "Timed duel · 3 minutes",
                  )}
                  icon={Users}
                  onPress={() => setMode("duel")}
                />
                <Button
                  secondary={mode !== "race"}
                  label={l("Sprint · 60 secondes", "Sprint · 60 seconds")}
                  icon={Timer}
                  onPress={() => setMode("race")}
                />
              </View>
              <Txt>
                {mode === "duel"
                  ? l(
                      "Même série de 10 questions, 3 minutes. Le plus grand nombre de réponses correctes gagne.",
                      "The same 10 questions, 3 minutes. The most correct answers wins.",
                    )
                  : l(
                      "Répondez au plus de questions possible en 60 secondes, jusqu’à 10. Chaque bonne réponse vaut 1 point ; les réponses fausses ne rapportent rien.",
                      "Answer as many questions as possible in 60 seconds, up to 10. Each correct answer earns 1 point; wrong answers earn none.",
                    )}
              </Txt>
              <Txt muted>
                {l(
                  "Série mixte : les schémas d’anatomie correspondent à votre année d’étude.",
                  "Mixed question set: anatomy diagrams match your study year.",
                )}
              </Txt>
              <Button
                label={l(
                  "Créer une invitation · 1 session",
                  "Create invitation · 1 session",
                )}
                disabled={busy}
                onPress={() => void createMatch()}
              />
              <Txt style={{ fontWeight: "600" }}>
                {l("Ou rejoindre avec un code", "Or join with a code")}
              </Txt>
              <TextInput
                accessibilityLabel={l("Code d’invitation", "Invitation code")}
                value={code}
                onChangeText={(value) =>
                  setCode(value.toUpperCase().replace(/[^A-F0-9]/g, ""))
                }
                maxLength={12}
                autoCapitalize="characters"
                autoCorrect={false}
                style={inputStyle}
              />
              <Button
                secondary
                label={l("Rejoindre · 1 session", "Join · 1 session")}
                disabled={busy || code.length !== 12}
                onPress={() =>
                  void perform(async () => {
                    const order = ++sequence.current;
                    applyMatch(await competitive.join(code), order);
                  })
                }
              />
            </Card>
          )}
          {match && (
            <Card style={{ gap: 16 }}>
              {!match.ranked && (
                <Txt style={{ fontWeight: "700" }}>
                  {l(
                    "Revanche d’entraînement · sans points Elo",
                    "Practice rematch · no Elo points",
                  )}
                </Txt>
              )}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <Title style={{ fontSize: 22 }}>
                  {match.mode === "duel"
                    ? l("Duel chronométré", "Timed duel")
                    : l("Sprint", "Sprint")}
                </Title>
                {match.status === "playing" && (
                  <Txt
                    accessibilityRole="timer"
                    style={{ fontSize: 22, fontWeight: "700" }}
                  >{`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`}</Txt>
                )}
              </View>
              <View style={{ gap: 8 }}>
                {match.players.map((player, index) => (
                  <View
                    key={index}
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 8,
                      justifyContent: "space-between",
                    }}
                  >
                    <Txt
                      style={{ fontWeight: player.self ? "700" : "400" }}
                    >{`${player.nickname}${player.self ? l(" (vous)", " (you)") : ""} · ${l("année", "year")} ${player.studyYear}`}</Txt>
                    <Txt>
                      {match.status === "finished"
                        ? `${player.score}/10 · ${player.ratingDelta != null && player.ratingDelta >= 0 ? "+" : ""}${player.ratingDelta ?? 0} Elo`
                        : `${player.answered}/10 ${l("répondues", "answered")}`}
                    </Txt>
                  </View>
                ))}
              </View>
              {match.status === "waiting" && (
                <>
                  <Txt>
                    {l(
                      "Code valable une heure. Partagez-le avec votre adversaire :",
                      "Code valid for one hour. Share it with your opponent:",
                    )}
                  </Txt>
                  <Txt
                    selectable
                    style={{
                      fontSize: 26,
                      fontWeight: "700",
                      letterSpacing: 3,
                    }}
                  >
                    {match.code}
                  </Txt>
                  <Button
                    secondary
                    icon={Copy}
                    label={l("Copier le code", "Copy code")}
                    onPress={() =>
                      void perform(async () => {
                        if (
                          Platform.OS === "web" &&
                          typeof navigator !== "undefined" &&
                          navigator.clipboard
                        )
                          await navigator.clipboard.writeText(match.code);
                        else
                          await Share.share({
                            message: `Ippomed: ${match.code}`,
                          });
                        setMessage(
                          l("Code prêt à partager.", "Code ready to share."),
                        );
                      })
                    }
                  />
                  <Txt>
                    {match.players.length < 2
                      ? l(
                          "En attente du deuxième joueur…",
                          "Waiting for the second player…",
                        )
                      : l(
                          "Les deux joueurs sont prêts. L’hôte peut lancer le départ commun.",
                          "Both players are ready. The host can start the shared countdown.",
                        )}
                  </Txt>
                  {match.host && (
                    <Button
                      label={l("Lancer la partie", "Start match")}
                      disabled={busy || match.players.length !== 2}
                      onPress={() =>
                        void perform(async () => {
                          const order = ++sequence.current;
                          applyMatch(await competitive.start(match.id), order);
                        })
                      }
                    />
                  )}
                  <Button
                    secondary
                    label={
                      match.host
                        ? l("Annuler l’invitation", "Cancel invitation")
                        : l("Quitter l’invitation", "Leave invitation")
                    }
                    disabled={busy}
                    onPress={() =>
                      void perform(async () => {
                        await competitive.cancel(match.id);
                        ++sequence.current;
                        applied.current = sequence.current;
                        setMatch(null);
                        await refreshHome();
                      })
                    }
                  />
                </>
              )}
              {match.status === "playing" && (
                <>
                  {countdown > 0 ? (
                    <Title>
                      {l(
                        `Départ dans ${countdown}…`,
                        `Starting in ${countdown}…`,
                      )}
                    </Title>
                  ) : seconds === 0 ? (
                    <Txt>
                      {l(
                        "Temps écoulé. Vérification du résultat par le serveur…",
                        "Time is up. The server is checking the result…",
                      )}
                    </Txt>
                  ) : q ? (
                    <>
                      <Txt
                        muted
                      >{`${l("Question", "Question")} ${match.ordinal + 1}/10`}</Txt>
                      <Title style={{ fontSize: 20 }}>{q.title}</Title>
                      <Txt>{q.context}</Txt>
                      {q.diagram && (
                        <QuestionFigure
                          structureId={q.diagram.structureId}
                          hideLabels
                          language={language}
                          height={260}
                          view={
                            q.diagram.view
                              ? q.diagram.view === "back"
                                ? "posterior"
                                : "anterior"
                              : undefined
                          }
                        />
                      )}
                      <View style={{ gap: 10 }}>
                        {q.options.map((option, index) => (
                          <Button
                            key={`${match.ordinal}-${index}`}
                            secondary
                            label={`${String.fromCharCode(65 + index)}. ${option}`}
                            disabled={busy}
                            onPress={() =>
                              void perform(async () => {
                                const order = ++sequence.current;
                                applyMatch(
                                  await competitive.answer(
                                    match.id,
                                    match.ordinal,
                                    index,
                                  ),
                                  order,
                                );
                              })
                            }
                          />
                        ))}
                      </View>
                      <Txt muted>
                        {l(
                          "La première réponse envoyée est définitive. Les corrections apparaissent après la fin de la partie.",
                          "Your first submitted answer is final. Explanations appear after the match ends.",
                        )}
                      </Txt>
                    </>
                  ) : (
                    <Txt>
                      {match.ordinal >= 10
                        ? l(
                            "Vos 10 réponses sont enregistrées. En attente de l’adversaire ou du chronomètre.",
                            "Your 10 answers are saved. Waiting for your opponent or the timer.",
                          )
                        : l("Chargement de la question…", "Loading question…")}
                    </Txt>
                  )}
                  <Button
                    secondary
                    small
                    icon={RefreshCw}
                    label={l("Actualiser la partie", "Refresh match")}
                    disabled={busy}
                    onPress={() => void perform(() => refreshMatch(match.id))}
                  />
                </>
              )}
              {match.status === "finished" && (
                <>
                  <Title style={{ fontSize: 20 }}>
                    {(() => {
                      const self = match.players.find((player) => player.self);
                      const other = match.players.find(
                        (player) => !player.self,
                      );
                      return self?.score === other?.score
                        ? l("Égalité", "Draw")
                        : (self?.score ?? 0) > (other?.score ?? 0)
                          ? l("Victoire !", "You won!")
                          : l("Partie terminée", "Match complete");
                    })()}
                  </Title>
                  <Txt>
                    {l(
                      "Le classement utilise un Elo avec un coefficient de 24. Trois parties servent au placement. Les scores sont calculés et enregistrés par le serveur.",
                      "Rankings use Elo with a K-factor of 24. Three matches are used for placement. Scores are calculated and saved by the server.",
                    )}
                  </Txt>
                  <Button
                    label={l("Retour aux invitations", "Back to invitations")}
                    onPress={() => {
                      applied.current = ++sequence.current;
                      setMatch(null);
                    }}
                  />
                  <Title style={{ fontSize: 20 }}>
                    {l("Mes corrections", "My explanations")}
                  </Title>
                  {(match.review ?? []).map((answer) => {
                    const item = answer[language];
                    return (
                      <View
                        key={answer.ordinal}
                        style={{
                          paddingTop: 14,
                          borderTopWidth: 1,
                          borderColor: c.line,
                          gap: 6,
                        }}
                      >
                        <Txt
                          style={{ fontWeight: "700" }}
                        >{`${answer.ordinal + 1}. ${answer.correct ? l("Bonne réponse", "Correct") : l("À revoir", "Review")}`}</Txt>
                        <Txt>{item.context}</Txt>
                        {item.diagram && (
                          <QuestionFigure
                            structureId={item.diagram.structureId}
                            hideLabels={false}
                            language={language}
                            height={220}
                            view={
                              item.diagram.view
                                ? item.diagram.view === "back"
                                  ? "posterior"
                                  : "anterior"
                                : undefined
                            }
                          />
                        )}
                        <Txt>{`${l("Votre réponse", "Your answer")} : ${item.options[answer.choice]}`}</Txt>
                        <Txt>{`${l("Réponse attendue", "Expected answer")} : ${item.options[answer.correctChoice]}`}</Txt>
                        <Txt muted>{item.reasoning}</Txt>
                      </View>
                    );
                  })}
                </>
              )}
              {match.status === "cancelled" && (
                <>
                  <Txt>
                    {l(
                      "Cette invitation a été annulée ou a expiré.",
                      "This invitation was cancelled or expired.",
                    )}
                  </Txt>
                  <Button
                    secondary
                    label={l("Retour aux invitations", "Back to invitations")}
                    onPress={() => {
                      applied.current = ++sequence.current;
                      setMatch(null);
                    }}
                  />
                </>
              )}
            </Card>
          )}
          {!match && !!recent.length && (
            <Card style={{ gap: 12 }}>
              <Title style={{ fontSize: 20 }}>
                {l("Mes dernières parties", "My recent matches")}
              </Title>
              {recent.map((item) => (
                <Button
                  key={item.id}
                  secondary
                  label={`${item.mode === "duel" ? l("Duel", "Duel") : "Sprint"} · ${item.code} · ${item.status === "finished" ? l("résultats", "results") : item.status === "cancelled" ? l("annulée", "cancelled") : l("reprendre", "resume")}`}
                  disabled={busy}
                  onPress={() => void perform(() => refreshMatch(item.id))}
                />
              ))}
            </Card>
          )}
          <Card style={{ gap: 14 }}>
            <Title style={{ fontSize: 20 }}>
              {l("Classement par année · bêta", "Study-year rankings · beta")}
            </Title>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {Array.from({ length: 12 }, (_, index) => index + 1).map(
                (value) => (
                  <Chip
                    key={value}
                    selected={boardYear === value}
                    label={
                      value <= 6
                        ? l(`Année ${value}`, `Year ${value}`)
                        : l(
                            `Internat · année ${value}`,
                            `Residency · year ${value}`,
                          )
                    }
                    onPress={() => setBoardYear(value)}
                  />
                ),
              )}
            </View>
            {board && (
              <Txt
                muted
              >{`${l("Saison", "Season")} ${board.season} · ${l("100 premiers joueurs ayant terminé une partie", "Top 100 players who have completed a match")}`}</Txt>
            )}
            {!board?.players.length ? (
              <Txt>
                {l(
                  "Aucune partie terminée dans cette année pour l’instant. Invitez le premier adversaire.",
                  "No completed matches for this study year yet. Invite the first opponent.",
                )}
              </Txt>
            ) : (
              board.players.map((player, index) => (
                <View
                  key={`${index}-${player.nickname}`}
                  style={{
                    paddingVertical: 10,
                    borderTopWidth: 1,
                    borderColor: c.line,
                    gap: 4,
                  }}
                >
                  <Txt
                    style={{ fontWeight: player.self ? "700" : "500" }}
                  >{`${index + 1}. ${player.nickname}${player.self ? l(" (vous)", " (you)") : ""} · ${competitiveRank(player.rating, player.played, en)} · ${player.rating} Elo`}</Txt>
                  <Txt
                    muted
                  >{`${player.played} ${l("parties", "matches")} · ${player.wins} ${l("victoires", "wins")} · ${player.draws} ${l("égalités", "draws")}`}</Txt>
                </View>
              ))
            )}
          </Card>
        </>
      )}
    </View>
  );
}
