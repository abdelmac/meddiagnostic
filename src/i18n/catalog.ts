import { questions as fr, specialties as definitions } from "../data/questions";
import { questionsEn } from "../data/questions.en";
import { useI18n } from "./index";
export function useCatalog() {
  const { language, t } = useI18n();
  const questions = language === "fr" ? fr : questionsEn;
  return {
    questions,
    specialties: definitions.map((s) => ({
      ...s,
      name: t(s.name),
      subtitle: t(s.subtitle),
    })),
    getQ: (id: string) => questions.find((q) => q.id === id)!,
    day: (iso: string) =>
      new Date(iso).toLocaleDateString(language === "fr" ? "fr-FR" : "en-GB", {
        day: "numeric",
        month: "short",
      }),
  };
}
