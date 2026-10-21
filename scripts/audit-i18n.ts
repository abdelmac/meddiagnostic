import ts from "typescript";
import fs from "node:fs";
import { en } from "../src/i18n/en";
const missing = new Set<string>();
for (const file of ["app/index.tsx", "src/ui/components.tsx", "src/ui/AccountPanel.tsx", "src/ui/SubscriptionPanel.tsx", "src/ui/DeleteAccountPanel.tsx", "src/ui/QuotaPanel.tsx"]) {
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  function visit(n: ts.Node) {
    if (
      ts.isCallExpression(n) &&
      n.expression.getText(source) === "t" &&
      n.arguments[0] &&
      ts.isStringLiteral(n.arguments[0])
    ) {
      const key = n.arguments[0].text;
      if (
        !(key in en) &&
        /[a-zA-ZÀ-ÿ]/.test(key) &&
        !["Ippomed", "Ippomed Premium"].includes(key)
      )
        missing.add(key);
    }
    ts.forEachChild(n, visit);
  }
  visit(source);
}
if (missing.size) {
  console.error([...missing]);
  process.exitCode = 1;
} else console.log("All explicit UI messages have English translations.");
