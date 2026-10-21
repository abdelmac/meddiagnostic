import React from "react";
import { ScrollViewStyleReset, useServerDocumentContext } from "expo-router/html";
export default function Root({ children }: { children: React.ReactNode }) {
  const { htmlAttributes, bodyAttributes, headNodes, bodyNodes } = useServerDocumentContext();
  return <html {...htmlAttributes} lang="fr"><head>
    {headNodes}
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#6024df" />
    <meta name="description" content="Ippomed : révisez l’anatomie en 3D, progressez avec des quiz médicaux et retrouvez vos séries de révision. Anatomy, medical quizzes and daily study streaks." />
    <title>Ippomed — Apprendre, comprendre, retenir</title>
    <link rel="icon" type="image/png" href="/brand/ippomed-emblem.png" />
    <ScrollViewStyleReset />
  </head><body {...bodyAttributes}>{children}{bodyNodes}</body></html>;
}
