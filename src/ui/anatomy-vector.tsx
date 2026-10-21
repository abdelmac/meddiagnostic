import React, { useId } from "react";
import { Text, View } from "react-native";
import Svg, {
  Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Stop, Text as SvgText,
} from "react-native-svg";
import {
  anatomyStructure, anatomyStructures, anatomySystem,
  type AnatomyLanguage, type AnatomySystem, type AnatomyView,
} from "../data/anatomy-structures";
import {
  anatomyShape, anatomyShapes, anatomyViewBox, humanOutline,
  type AnatomyShape,
} from "../data/anatomy-geometry";
import { useI18n } from "../i18n";

type HumanFigureProps = {
  system: AnatomySystem;
  view: AnatomyView;
  selectedId?: string;
  onSelect?: (id: string) => void;
  zoom?: number;
  height?: number;
  hideLabels?: boolean;
  language?: AnatomyLanguage;
  targetOnly?: boolean;
};

function Shape({
  shape, color, selected, onPress,
}: { shape: AnatomyShape; color: string; selected: boolean; onPress?: () => void }) {
  const fill = shape.strokeWidth ? "none" : color;
  const stroke = selected ? "#8b5a16" : shape.strokeWidth ? color : "#5b5553";
  const path = (
    <>
      <Path
        d={shape.path}
        fill={fill}
        fillOpacity={selected ? 1 : 0.72}
        fillRule="evenodd"
        stroke={stroke}
        strokeWidth={shape.strokeWidth ? shape.strokeWidth + (selected ? 1.3 : 0) : selected ? 2 : 0.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {!!onPress && (
        <Path
          d={shape.path}
          fill={shape.strokeWidth ? "none" : "transparent"}
          stroke="transparent"
          strokeWidth={shape.strokeWidth ? Math.max(18, shape.strokeWidth) : 3}
          onPress={onPress}
        />
      )}
    </>
  );
  return <G>{path}{shape.mirror && <G transform="translate(320 0) scale(-1 1)">{path}</G>}</G>;
}

/** Original transparent-layer diagram. Structure buttons outside the SVG provide keyboard access. */
export function HumanFigure({
  system, view, selectedId, onSelect, zoom = 1, height = 560,
  hideLabels = false, language = "fr", targetOnly = false,
}: HumanFigureProps) {
  const unique = useId().replace(/:/g, "");
  const gradientId = `anatomy-body-${unique}`;
  const selected = selectedId ? anatomyStructure(selectedId) : undefined;
  const selectedShape = selectedId ? anatomyShape(selectedId, view) : undefined;
  const box = anatomyViewBox(zoom, selectedShape?.anchor);
  const palette = anatomySystem(system);
  const shapes = anatomyShapes.filter((shape) => shape.views.includes(view)
    && anatomyStructure(shape.id)?.system === system);
  // Always render the selected structure last so overlapping landmarks stay visible.
  const ordered = shapes.filter((shape) => shape.id !== selectedId);
  if (selectedShape) ordered.push(selectedShape);
  const target = selectedShape?.anchor;
  const caption = hideLabels
    ? language === "fr" ? "Schéma anatomique : identifiez la structure repérée A." : "Anatomical diagram: identify the structure marked A."
    : `${language === "fr" ? "Corps humain, vue" : "Human body,"} ${view === "anterior" ? language === "fr" ? "antérieure" : "anterior view" : language === "fr" ? "postérieure" : "posterior view"}${selected ? ` — ${selected.name[language]}` : ""}`;
  return (
    <Svg
      width="100%"
      height={height}
      viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
      preserveAspectRatio="xMidYMid meet"
      accessibilityRole="image"
      accessibilityLabel={caption}
      accessible
      testID={hideLabels ? "anatomy-question-diagram" : "anatomy-body-diagram"}
    >
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="75%">
          <Stop offset="0%" stopColor="#f5ece2" />
          <Stop offset="100%" stopColor="#ded5c9" />
        </LinearGradient>
      </Defs>
      <Ellipse cx={160} cy={696} rx={53} ry={7} fill="#20443f" opacity={0.07} />
      <Line x1={160} y1={8} x2={160} y2={692} stroke="#bfd2cb" strokeDasharray="3 8" opacity={0.5} />
      <Path d={humanOutline} fill={`url(#${gradientId})`} stroke="#b7ac9e" strokeWidth={1.2} />
      {view === "anterior" ? (
        <G fill="none" stroke="#bcb0a2" strokeWidth={0.9} opacity={0.8}>
          <Path d="M143 61 Q148 59 151 62 M169 62 Q174 59 179 61 M160 61 L157 73 L163 73 M151 80 Q160 84 169 80 M145 104 L151 123 M175 104 L169 123 M120 136 Q137 131 157 137 M163 137 Q183 131 200 136 M160 182 L160 309 M131 292 Q137 313 153 326 M189 292 Q183 313 167 326" />
          <Circle cx={160} cy={273} r={2} />
          <Path d="M127 497 Q138 504 149 497 M171 497 Q182 504 193 497 M48 375 L69 380 M251 380 L272 375" />
        </G>
      ) : (
        <G fill="none" stroke="#bcb0a2" strokeWidth={1} opacity={0.8}>
          <Path d="M160 96 L160 318 M142 110 Q129 132 123 169 M178 110 Q191 132 197 169 M122 160 Q140 170 144 196 M198 160 Q180 170 176 196 M122 331 Q139 313 158 338 M198 331 Q181 313 162 338 M160 337 L160 385 M130 493 L147 493 M173 493 L190 493" />
        </G>
      )}
      {system === "skeleton" && (
        <G fill="none" stroke="#a6b5bc" opacity={0.7} strokeWidth={2.5}>
          <Path d="M160 101 L160 296 M128 155 Q148 150 160 157 Q173 150 192 155 M123 171 Q145 173 160 169 Q176 173 197 171 M122 186 Q143 197 160 184 Q176 197 198 186 M122 202 Q142 217 160 198 Q179 217 198 202 M124 217 Q143 232 160 211 Q177 232 196 217 M129 232 Q146 245 160 223 Q174 245 191 232" />
          <Path d="M129 513 L128 623 M191 513 L192 623" strokeWidth={3} />
        </G>
      )}
      {system === "muscles" && view === "anterior" && (
        <G fill="none" stroke="#a65a58" strokeWidth={1.1} opacity={0.4}>
          <Path d="M123 190 L127 263 M197 190 L193 263 M143 217 L155 217 M143 239 L155 239 M143 262 L155 262 M165 217 L177 217 M165 239 L177 239 M165 262 L177 262 M91 280 L68 351 M229 280 L252 351 M126 520 L140 589 M194 520 L180 589" />
        </G>
      )}
      {system === "nerves" && (
        <G fill="none" stroke="#c6a35f" opacity={0.35} strokeWidth={1.5}>
          {Array.from({ length: 11 }, (_, i) => {
            const y = 129 + i * 12;
            return <Path key={i} d={`M160 ${y} L${142 - i / 3} ${y + 9} M160 ${y} L${178 + i / 3} ${y + 9}`} />;
          })}
        </G>
      )}
      {system === "organs" && view === "anterior" && (
        <G fill="none" stroke="#9682a6" strokeWidth={2} opacity={0.5}>
          <Path d="M160 98 L160 155 M160 143 L145 163 M160 143 L175 163 M128 294 Q140 285 149 296 T173 297 T190 299 L190 316 Q180 329 168 318 T142 319 T128 312 Z M139 298 Q155 310 178 299 M139 311 Q158 301 177 313" />
        </G>
      )}
      {ordered.filter((shape) => !targetOnly || shape.id === selectedId).map((shape) => (
        <Shape
          key={shape.id}
          shape={shape}
          color={shape.id === selectedId ? "#e9b75f" : shape.color ?? palette.color}
          selected={shape.id === selectedId}
          onPress={onSelect ? () => onSelect(shape.id) : undefined}
        />
      ))}
      {!!target && (
        <G pointerEvents="none">
          <Circle cx={target[0]} cy={target[1]} r={6} fill="#fff" stroke="#805317" strokeWidth={1.8} />
          <Line x1={target[0] - 5} y1={target[1] - 5} x2={target[0] - 22} y2={target[1] - 23} stroke="#805317" strokeWidth={1.8} />
          <Circle cx={target[0] - 28} cy={target[1] - 29} r={11} fill="#805317" />
          <SvgText x={target[0] - 28} y={target[1] - 25} textAnchor="middle" fontSize={12} fontWeight="700" fill="#fff">A</SvgText>
        </G>
      )}
      <SvgText x={48} y={130} textAnchor="middle" fontSize={10} fill="#617b76">
        {view === "anterior" ? language === "fr" ? "D" : "R" : language === "fr" ? "G" : "L"}
      </SvgText>
      <SvgText x={272} y={130} textAnchor="middle" fontSize={10} fill="#617b76">
        {view === "anterior" ? language === "fr" ? "G" : "L" : language === "fr" ? "D" : "R"}
      </SvgText>
    </Svg>
  );
}

/** The marked structure's name is absent from captions and accessibility labels during a quiz. */
export function QuestionFigure({
  structureId, hideLabels = true, language: requestedLanguage, height = 350, view: requestedView,
}: {
  structureId: string;
  hideLabels?: boolean;
  language?: AnatomyLanguage;
  height?: number;
  view?: AnatomyView;
}) {
  const { language: currentLanguage } = useI18n();
  const language = requestedLanguage ?? currentLanguage;
  const structure = anatomyStructure(structureId);
  if (!structure) return null;
  const view = requestedView && structure.views.includes(requestedView)
    ? requestedView : structure.views[0]!;
  return (
    <View style={{ borderWidth: 1, borderColor: "#dce7e1", borderRadius: 14, backgroundColor: "#f5f8f5", padding: 12, gap: 4 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
        <Text style={{ color: "#526f69", fontSize: 11, fontWeight: "600" }}>
          {view === "anterior" ? language === "fr" ? "VUE ANTÉRIEURE" : "ANTERIOR VIEW" : language === "fr" ? "VUE POSTÉRIEURE" : "POSTERIOR VIEW"}
        </Text>
        <Text style={{ color: "#805317", fontSize: 11, fontWeight: "700" }}>{language === "fr" ? "REPÈRE A" : "MARKER A"}</Text>
      </View>
      <HumanFigure system={structure.system} view={view} selectedId={structureId} height={height} zoom={1.5} hideLabels={hideLabels} language={language} />
      {!hideLabels && <Text style={{ color: "#294f47", textAlign: "center", fontSize: 14, fontWeight: "600" }}>{structure.name[language]}</Text>}
      <Text style={{ color: "#617b76", fontSize: 11, textAlign: "center" }}>
        {language === "fr" ? "Schéma de repérage original, simplifié et non à l’échelle." : "Original simplified landmark diagram; not to scale."}
      </Text>
    </View>
  );
}

// The data exports keep consumers from needing to inspect the SVG implementation.
export { anatomyStructures };
