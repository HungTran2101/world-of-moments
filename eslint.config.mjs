import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const sizingVariableClass = /(^|[\s"'`:!])((?:(?:min|max)-)?[hw]|size)-\[var\((--[^\s\]]+)\)\](?=$|[\s"'`!])/g;
const classStrings = ':matches(JSXAttribute[name.name="className"], CallExpression[callee.name=/^(cn|cva|clsx|twMerge)$/]) :matches(Literal, TemplateElement)';

const tailwindSizingShorthand = {
  meta: {
    type: "suggestion",
    fixable: "code",
    schema: [],
    messages: { useShorthand: "Use the Tailwind CSS v4 sizing shorthand, such as h-(--height)." },
  },
  create(context) {
    return {
      [classStrings](node) {
        if (node.type === "Literal" && typeof node.value !== "string") return;

        const original = context.sourceCode.getText(node);
        const updated = original.replace(sizingVariableClass, "$1$2-($3)");
        if (updated === original) return;

        context.report({
          node,
          messageId: "useShorthand",
          fix: (fixer) => fixer.replaceText(node, updated),
        });
      },
    };
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: { "dear-world": { rules: { "tailwind-sizing-shorthand": tailwindSizingShorthand } } },
    rules: { "dear-world/tailwind-sizing-shorthand": "warn" },
  },
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "no-restricted-imports": ["error", {
        paths: [
          {
            name: "radix-ui",
            importNames: ["Dialog"],
            message: "Import Dialog from @/components/ui/dialog for shared modal motion.",
          },
          {
            name: "@radix-ui/react-dialog",
            message: "Import Dialog from @/components/ui/dialog for shared modal motion.",
          },
        ],
      }],
    },
  },
  {
    files: ["components/ui/dialog/index.tsx"],
    rules: { "no-restricted-imports": "off" },
  },
]);

export default eslintConfig;
