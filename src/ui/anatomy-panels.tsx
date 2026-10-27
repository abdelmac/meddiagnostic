import React from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { ArrowUpRight, Search, Sparkles } from "lucide-react-native";
import type { AnatomyFocus } from "../domain/types";
import type { AnatomyAtlasState } from "./useAnatomyAtlas";
import { Button, Title, Txt, wrap } from "./components";

const focusLabels = {
  origin: { fr: "Origines", en: "Origins" },
  insertion: { fr: "Insertions", en: "Insertions" },
  action: { fr: "Actions", en: "Actions" },
  innervation: { fr: "Innervation", en: "Innervation" },
};
export function AnatomyInspector({
  atlas,
  onPractice,
  compact = true,
}: {
  atlas: AnatomyAtlasState;
  onPractice?: (focus?: AnatomyFocus, structureId?: string) => void;
  compact?: boolean;
}) {
  const {
    language,
    width,
    l,
    sourceId,
    setSourceId,
    catalog,
    anatomyModelManifest,
    anatomyModelMeshes,
    atlasLandmarks,
    atlasMeshStructures,
    atlasStructure,
    atlasQuizStructureId,
    detailMeshIds,
    initial,
    system,
    setSystem,
    view,
    setView,
    selectedId,
    setSelectedId,
    mode,
    setMode,
    overlays,
    setOverlays,
    zoom,
    setZoom,
    search,
    setSearch,
    resultLimit,
    setResultLimit,
    isolate,
    setIsolate,
    detailMode,
    setDetailMode,
    opacity,
    setOpacity,
    hiddenIds,
    setHiddenIds,
    inspector,
    setInspector,
    reset,
    setReset,
    focusKey,
    setFocusKey,
    regionBounds,
    setRegionBounds,
    regionKey,
    setRegionKey,
    activeRegion,
    setActiveRegion,
    expanded,
    setExpanded,
    sourceError,
    setSourceError,
    stage,
    revealStage,
    selected,
    palette,
    regions,
    muscle,
    quizId,
    alternateSource,
    alternateStructure,
    detailAvailable,
    visibleSystems,
    hidden,
    query,
    landmarks,
    results,
    select,
    changeSource,
    changeSystem,
    changeMode,
    changeView,
    toggleHidden,
    restore,
    appearance,
    setAppearance,
  } = atlas;
  return (
    <View
      testID="anatomy-selected-structure"
      style={{
        width: compact ? "100%" : 285,
        padding: 21,
        borderLeftWidth: compact ? 0 : 1,
        borderTopWidth: compact ? 1 : 0,
        borderColor: "#392c43",
        backgroundColor: "#21172b",
        gap: 15,
      }}
    >
      <Txt style={{ color: "#af99bf", fontSize: 10, letterSpacing: 1 }}>
        {selected.region[language].toUpperCase()}
      </Txt>
      <Title style={{ color: "#fff", fontSize: 24, lineHeight: 31 }}>
        {selected.name[language]}
      </Title>
      {detailMode && (
        <Txt style={{ color: "#b8a7cc", fontSize: 11 }}>
          {l(
            "Vue de détail isolée : référence BodyParts3D 3.0, plus dense. Ce modèle distinct sert à étudier la forme ; revenez au corps pour explorer les rapports.",
            "Isolated detail: denser BodyParts3D 3.0 reference. This separate model shows shape; return to the body to explore relationships.",
          )}
        </Txt>
      )}
      {!!selected.fmaId && (
        <Txt style={{ color: "#a18aae", fontSize: 10 }}>
          {selected.fmaId}
          {selected.id !== selected.fmaId
            ? ` · ${selected.id.split("_").at(-1)}`
            : ""}
        </Txt>
      )}
      {!!selected.representationGroup && (
        <Txt style={{ color: "#a18aae", fontSize: 11 }}>
          {l("Variante du modèle source", "Source model variant")}
        </Txt>
      )}
      {language === "fr" && !selected.translated && (
        <Txt style={{ color: "#c4b0d3", fontSize: 11 }}>
          {l(
            "Nom de la source en anglais ; traduction spécialisée à compléter.",
            "Original English source term.",
          )}
        </Txt>
      )}
      {mode === "3d" && !selected.meshIds.length && (
        <View
          style={{
            padding: 12,
            borderRadius: 10,
            backgroundColor: "#3c2c27",
            gap: 8,
          }}
        >
          <Txt style={{ color: "#f0cf9b", fontSize: 11 }}>
            {l(
              "Ce repère n’est pas modélisé dans cette référence. Sa fiche et son schéma restent accessibles.",
              "This landmark is not modelled in this reference. Its notes and diagram remain available.",
            )}
          </Txt>
          {!!alternateStructure?.meshIds.length && (
            <Button
              secondary
              small
              label={
                alternateSource === "extended"
                  ? l("Voir dans le corps complet", "View in whole body")
                  : l("Voir dans le corps détaillé", "View in detailed body")
              }
              onPress={() => changeSource(alternateSource)}
            />
          )}
          <Button
            secondary
            small
            label={l("Voir le schéma 2D", "View 2D diagram")}
            onPress={() => changeMode("2d")}
          />
        </View>
      )}
      {hidden && mode === "3d" && (
        <Txt style={{ color: "#e5c58c", fontSize: 11 }}>
          {l(
            "Structure masquée. Utilisez Afficher pour la retrouver.",
            "Structure hidden. Use Show to reveal it again.",
          )}
        </Txt>
      )}
      <View style={{ flexDirection: "row", gap: 5, flexWrap: "wrap" }}>
        {(["overview", "attachments", "quiz"] as const).map((value) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityLabel={
              value === "overview"
                ? l("Fiche de structure", "Structure notes")
                : value === "attachments"
                  ? l("Origines et insertions", "Origins and insertions")
                  : l("Quiz sur cette structure", "Quiz this structure")
            }
            aria-pressed={inspector === value}
            onPress={() => setInspector(value)}
            style={{
              paddingVertical: 9,
              minHeight: 40,
              paddingHorizontal: 10,
              borderRadius: 8,
              backgroundColor: inspector === value ? "#513968" : "#30223c",
            }}
          >
            <Txt
              style={{
                color: inspector === value ? "#d7f7a7" : "#c9b7d6",
                fontSize: 11,
              }}
            >
              {value === "overview"
                ? l("Fiche", "Notes")
                : value === "attachments"
                  ? l("Attaches", "Attachments")
                  : "Quiz"}
            </Txt>
          </Pressable>
        ))}
      </View>
      {inspector === "overview" && (
        <>
          <Txt style={{ color: "#e3d5ec", fontSize: 13 }}>
            {selected.summary[language]}
          </Txt>
          {selected.legacyId && !selected.landmark && (
            <Txt style={{ color: "#b7a1c9", fontSize: 11 }}>
              {l("Fiche du groupe : ", "Group notes: ")}
              {atlasStructure(selected.legacyId)?.name[language]}
            </Txt>
          )}
          {muscle && (
            <Txt style={{ color: "#b7a1c9", fontSize: 12 }}>
              {l(
                "Origines, insertions, action et innervation dans l’onglet Attaches.",
                "Origins, insertions, actions and innervation are under Attachments.",
              )}
            </Txt>
          )}
        </>
      )}
      {inspector === "attachments" &&
        (muscle ? (
          <View style={{ gap: 16 }}>
            {(Object.keys(focusLabels) as (keyof typeof focusLabels)[]).map(
              (focus) => (
                <View key={focus} style={{ gap: 5 }}>
                  <Txt
                    style={{
                      color:
                        focus === "origin"
                          ? "#91d6ff"
                          : focus === "insertion"
                            ? "#f3cc8c"
                            : "#ceb7df",
                      fontSize: 11,
                      fontWeight: "700",
                    }}
                  >
                    {focusLabels[focus][language].toUpperCase()}
                  </Txt>
                  <Txt style={{ color: "#e4d7ec", fontSize: 12 }}>
                    {muscle[focus][language]}
                  </Txt>
                </View>
              ),
            )}
            <Txt style={{ color: "#a98fbb", fontSize: 10 }}>
              {l(
                "Les attaches sont décrites dans les fiches ; aucun point d’insertion approximatif n’est ajouté au modèle.",
                "Attachments are described in the notes; no approximate insertion points are added to the model.",
              )}
            </Txt>
          </View>
        ) : (
          <Txt style={{ color: "#cdbbd9", fontSize: 12 }}>
            {l(
              "Les fiches d’attaches sont disponibles pour les sept groupes musculaires étudiés dans les quiz.",
              "Attachment notes are available for the seven muscle groups covered by the quizzes.",
            )}
          </Txt>
        ))}
      {inspector === "quiz" && (
        <View style={{ gap: 10 }}>
          {quizId ? (
            <>
              <Txt style={{ color: "#cdbbd9", fontSize: 12 }}>
                {l("Rappel actif · ", "Active recall · ")}
                {atlasStructure(quizId)?.name[language]}
              </Txt>
              {muscle &&
                (Object.keys(focusLabels) as (keyof typeof focusLabels)[]).map(
                  (focus) => (
                    <Button
                      key={focus}
                      small
                      label={"Quiz · " + focusLabels[focus][language]}
                      onPress={() => onPractice?.(focus, quizId)}
                      disabled={!onPractice}
                    />
                  ),
                )}
              <Button
                small
                secondary
                label={l(
                  "Toutes les questions de cette structure",
                  "All questions for this structure",
                )}
                onPress={() => onPractice?.(undefined, quizId)}
                disabled={!onPractice}
              />
            </>
          ) : (
            <Txt style={{ color: "#cdbbd9", fontSize: 12 }}>
              {l(
                "Les quiz de cette structure détaillée ne sont pas encore disponibles. Retrouvez les questions dans les repères du cours.",
                "Quizzes for this detailed structure are not yet available. Choose a course landmark to find related questions.",
              )}
            </Txt>
          )}
        </View>
      )}
      <View style={{ height: 1, backgroundColor: "#412e4b" }} />
      {(
        muscle?.sources ??
        selected.sources.map((url) => ({
          title: l("Référence anatomique", "Anatomy reference"),
          url,
        }))
      )
        .slice(0, 2)
        .map((source, index) => (
          <Pressable
            key={source.url + index}
            accessibilityRole="link"
            onPress={() => {
              setSourceError(false);
              void Linking.openURL(source.url).catch(() =>
                setSourceError(true),
              );
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 7,
              minHeight: 40,
            }}
          >
            <Txt style={{ color: "#c6a5ee", fontSize: 11, flex: 1 }}>
              {source.title}
            </Txt>
            <ArrowUpRight size={13} color="#c6a5ee" />
          </Pressable>
        ))}
      {sourceError && (
        <Txt style={{ color: "#ffc7c7", fontSize: 11 }}>
          {l("Le lien n’a pas pu s’ouvrir.", "The link could not be opened.")}
        </Txt>
      )}
      <Txt style={{ color: "#a48db4", fontSize: 10 }}>
        {l(
          "Atlas de référence pour l’apprentissage. Fiches et quiz en attente de relecture médicale.",
          "Reference atlas for learning. Notes and quizzes await medical review.",
        )}
      </Txt>
      <Button
        label={l("S’entraîner en anatomie", "Practise anatomy")}
        small
        icon={Sparkles}
        onPress={() => onPractice?.()}
        disabled={!onPractice}
      />
    </View>
  );
}

export function AnatomyStructureSearch({
  atlas,
}: {
  atlas: AnatomyAtlasState;
}) {
  const {
    language,
    width,
    l,
    sourceId,
    setSourceId,
    catalog,
    anatomyModelManifest,
    anatomyModelMeshes,
    atlasLandmarks,
    atlasMeshStructures,
    atlasStructure,
    atlasQuizStructureId,
    detailMeshIds,
    initial,
    system,
    setSystem,
    view,
    setView,
    selectedId,
    setSelectedId,
    mode,
    setMode,
    overlays,
    setOverlays,
    zoom,
    setZoom,
    search,
    setSearch,
    resultLimit,
    setResultLimit,
    isolate,
    setIsolate,
    detailMode,
    setDetailMode,
    opacity,
    setOpacity,
    hiddenIds,
    setHiddenIds,
    inspector,
    setInspector,
    reset,
    setReset,
    focusKey,
    setFocusKey,
    regionBounds,
    setRegionBounds,
    regionKey,
    setRegionKey,
    activeRegion,
    setActiveRegion,
    expanded,
    setExpanded,
    sourceError,
    setSourceError,
    stage,
    revealStage,
    selected,
    palette,
    regions,
    muscle,
    quizId,
    alternateSource,
    alternateStructure,
    detailAvailable,
    visibleSystems,
    hidden,
    query,
    landmarks,
    results,
    select,
    changeSource,
    changeSystem,
    changeMode,
    changeView,
    toggleHidden,
    restore,
    appearance,
    setAppearance,
  } = atlas;
  const structureButton = (item: typeof selected, study = false) => (
    <Pressable
      key={item.id}
      accessibilityRole="button"
      accessibilityLabel={item.name[language]}
      accessibilityHint={
        item.representationGroup
          ? `${l("Modèle source", "Source model")} · ${item.id.split("_").at(-1)}`
          : undefined
      }
      aria-pressed={item.id === selectedId}
      onPress={() => select(item.id)}
      style={{
        minHeight: 40,
        borderWidth: 1,
        borderColor:
          item.id === selectedId ? "#b7e85c" : study ? "#705388" : "#49384f",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 9,
        backgroundColor:
          item.id === selectedId ? "#39482a" : study ? "#372345" : "#281d32",
        maxWidth: "100%",
      }}
    >
      <Txt
        style={{
          color: item.id === selectedId ? "#e7f9c9" : "#d9c9e3",
          fontSize: 12,
        }}
      >
        {item.name[language]}
        {sourceId === "extended" &&
        mode === "3d" &&
        item.meshIds.length > 0 &&
        item.meshIds.every((id) => detailMeshIds.has(id))
          ? " · HD"
          : ""}
      </Txt>
      {!!item.representationGroup && (
        <Txt style={{ color: "#b6a0c3", fontSize: 10, marginTop: 3 }}>
          {l("Modèle source", "Source model")} · {item.id.split("_").at(-1)}
        </Txt>
      )}
    </Pressable>
  );
  return (
    <View
      style={{
        padding: 17,
        borderTopWidth: 1,
        borderColor: "#392c43",
        gap: 15,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderWidth: 1,
          borderColor: "#4e3c59",
          borderRadius: 11,
          paddingHorizontal: 12,
          backgroundColor: "#261a30",
          gap: 9,
        }}
      >
        <Search size={16} color="#b49dc6" />
        <TextInput
          accessibilityLabel={l(
            "Rechercher une structure anatomique",
            "Search for an anatomical structure",
          )}
          placeholder={l(
            "Muscle, nerf, os, organe ou identifiant FMA…",
            "Muscle, nerve, bone, organ or FMA identifier…",
          )}
          placeholderTextColor="#a38bb4"
          value={search}
          onChangeText={setSearch}
          style={{
            color: "#eee4f7",
            minHeight: 48,
            flex: 1,
            minWidth: 0,
            fontSize: 14,
          }}
          autoCorrect={false}
        />
      </View>
      {landmarks.length > 0 && (
        <View style={{ gap: 9 }}>
          <Txt style={{ color: "#bfa6d0", fontSize: 11, fontWeight: "600" }}>
            {l(
              "REPÈRES DU COURS · FICHES ET QUIZ",
              "COURSE LANDMARKS · NOTES AND QUIZZES",
            )}
          </Txt>
          <View style={[wrap, { gap: 7 }]}>
            {landmarks.map((item) => structureButton(item, true))}
          </View>
        </View>
      )}
      {mode === "3d" && (
        <View style={{ gap: 9 }}>
          <Txt style={{ color: "#bfa6d0", fontSize: 11, fontWeight: "600" }}>
            {l("STRUCTURES DÉTAILLÉES", "DETAILED STRUCTURES")} ·{" "}
            {results.length}
          </Txt>
          <ScrollView
            nestedScrollEnabled
            style={{ maxHeight: 245 }}
            contentContainerStyle={{ paddingBottom: 6 }}
          >
            <View style={[wrap, { gap: 7 }]}>
              {results
                .slice(0, resultLimit)
                .map((item) => structureButton(item))}
            </View>
          </ScrollView>
          {results.length > resultLimit && (
            <Button
              secondary
              small
              label={l(
                "Afficher davantage de structures",
                "Show more structures",
              )}
              onPress={() => setResultLimit((current) => current + 60)}
            />
          )}
        </View>
      )}
      {!landmarks.length && !results.length && (
        <Txt style={{ color: "#c1aace", fontSize: 12 }}>
          {l("Aucune structure trouvée.", "No structure found.")}
        </Txt>
      )}
      <View
        style={{
          borderTopWidth: 1,
          borderColor: "#392c43",
          paddingTop: 13,
          gap: 6,
        }}
      >
        <Txt style={{ color: "#a88fb9", fontSize: 10 }}>
          {l(
            "Maillages : BodyParts3D · Database Center for Life Science (DBCLS). Adaptation et compression pour Ippomed.",
            "Meshes: BodyParts3D · Database Center for Life Science (DBCLS). Adapted and compressed for Ippomed.",
          )}
        </Txt>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={l(
            "Sources et licences du modèle 3D",
            "3D model sources and licences",
          )}
          onPress={() =>
            void Linking.openURL(
              Platform.OS === "web"
                ? sourceId === "detailed"
                  ? "/anatomy/bodyparts3d-complete/ATTRIBUTION.txt"
                  : "/anatomy/bodyparts3d/ATTRIBUTION.txt"
                : `https://medquiz-europe.medcompass-web.workers.dev/anatomy/${sourceId === "detailed" ? "bodyparts3d-complete" : "bodyparts3d"}/ATTRIBUTION.txt`,
            ).catch(() => setSourceError(true))
          }
          style={{ minHeight: 35, justifyContent: "center" }}
        >
          <Txt
            style={{
              fontSize: 11,
              color: "#c4a6e4",
              textDecorationLine: "underline",
            }}
          >
            {l(
              "Sources, licences et adaptations",
              "Sources, licences and adaptations",
            )}{" "}
            ↗
          </Txt>
        </Pressable>
        <Txt style={{ color: "#8e789f", fontSize: 10 }}>
          {anatomyModelManifest.dataset}
        </Txt>
      </View>
    </View>
  );
}
