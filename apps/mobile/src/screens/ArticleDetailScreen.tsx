import { useMemo } from "react";
import { Text, View } from "react-native";

import { getArticleTranslation, type Article } from "../domain/articles";
import type { LanguageCode } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type ArticleBlock =
  | { kind: "lead"; text: string }
  | { kind: "section"; paragraphs: string[]; title: string }
  | { headers: string[]; kind: "table"; rows: string[][] };

function parseArticleMarkdown(content: string) {
  const blocks: ArticleBlock[] = [];
  const lines = content.split(/\r?\n/);
  let paragraph: string[] = [];
  let currentSection: { paragraphs: string[]; title: string } | null = null;
  let index = 0;

  function flushParagraph() {
    if (!paragraph.length) {
      return;
    }

    const text = paragraph.join(" ");
    if (currentSection) {
      currentSection.paragraphs.push(text);
    } else {
      blocks.push({ kind: "lead", text });
    }
    paragraph = [];
  }

  function flushSection() {
    if (!currentSection) {
      return;
    }

    blocks.push({ kind: "section", paragraphs: currentSection.paragraphs, title: currentSection.title });
    currentSection = null;
  }

  while (index < lines.length) {
    const line = lines[index].trim();

    if (!line) {
      flushParagraph();
      index += 1;
      continue;
    }

    if (line.startsWith("## ")) {
      flushParagraph();
      flushSection();
      currentSection = { paragraphs: [], title: line.replace(/^##\s+/, "") };
      index += 1;
      continue;
    }

    if (line.startsWith("|")) {
      flushParagraph();
      const tableLines: string[] = [];

      while (index < lines.length && lines[index].trim().startsWith("|")) {
        tableLines.push(lines[index].trim());
        index += 1;
      }

      const rows = tableLines
        .filter((tableLine) => !/^\|\s*-+/.test(tableLine))
        .map((tableLine) =>
          tableLine
            .replace(/^\|/, "")
            .replace(/\|$/, "")
            .split("|")
            .map((cell) => cell.trim())
        );

      if (rows.length) {
        flushSection();
        blocks.push({ headers: rows[0], kind: "table", rows: rows.slice(1) });
      }

      continue;
    }

    paragraph.push(line);
    flushParagraph();
    index += 1;
  }

  flushParagraph();
  flushSection();
  return blocks;
}

export function formatArticleDate(value: string, language: LanguageCode) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat(language === "pl" ? "pl-PL" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

function splitTrainingPlanItems(value: string) {
  const sentenceParts = value.split(/\. (?=[A-ZŁŚŻŹĆŃÓĄĘ])/).map((part, index, parts) => {
    const trimmed = part.trim();
    return index < parts.length - 1 && !trimmed.endsWith(".") ? `${trimmed}.` : trimmed;
  });

  return sentenceParts
    .flatMap((part) => (part.includes("×") ? part.split(/,\s+(?=[^,]*\d+×)/) : [part]))
    .map((item) => capitalizeFirstLetter(item.trim()))
    .filter(Boolean);
}

function capitalizeFirstLetter(value: string) {
  if (!value) {
    return value;
  }

  return `${value.charAt(0).toLocaleUpperCase("pl-PL")}${value.slice(1)}`;
}

type ArticleDetailProps = {
  article: Article;
  language: LanguageCode;
  theme: Theme;
};

export function ArticleDetailScreen({ article, language, theme }: ArticleDetailProps) {
  const translation = getArticleTranslation(article, language);
  const blocks = useMemo(() => parseArticleMarkdown(translation.content), [translation.content]);

  return (
    <View style={styles.articleDetail}>
      <View style={[styles.articleDetailPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.articleCategory, { color: theme.primary }]}>{translation.category}</Text>
        <Text style={[styles.articleDetailTitle, { color: theme.text }]}>{translation.title}</Text>
        <Text style={[styles.articleMeta, { color: theme.muted }]}>
          {formatArticleDate(article.publishedAt, language)} · {article.readTime}
        </Text>
        {translation.summary ? (
          <Text style={[styles.articleParagraph, { color: theme.muted }]}>
            {translation.summary}
          </Text>
        ) : null}

        <View style={[styles.legalDivider, { backgroundColor: theme.border }]} />

        {blocks.map((block, blockIndex) => {
          if (block.kind === "lead") {
            return (
              <View
                key={`${block.kind}-${blockIndex}`}
                style={[styles.articleLead, { backgroundColor: theme.secondaryBand }]}
              >
                <Text style={[styles.articleLeadText, { color: theme.text }]}>
                  {block.text}
                </Text>
              </View>
            );
          }

          if (block.kind === "section") {
            return (
              <View key={`${block.kind}-${blockIndex}`} style={styles.articleSectionBlock}>
                <Text style={[styles.articleBlockHeading, { color: theme.text }]}>
                  {block.title}
                </Text>
                {block.paragraphs.map((paragraph, paragraphIndex) => (
                  <Text
                    key={`${block.title}-${paragraphIndex}`}
                    style={[styles.articleParagraph, { color: theme.muted }]}
                  >
                    {paragraph}
                  </Text>
                ))}
              </View>
            );
          }

          if (block.kind === "table") {
            return (
              <View key={`${block.kind}-${blockIndex}`} style={styles.articlePlanList}>
                <Text style={[styles.articlePlanTitle, { color: theme.text }]}>
                  {block.headers.join(" / ")}
                </Text>
                {block.rows.map((row, rowIndex) => (
                  <View
                    key={`${row.join("-")}-${rowIndex}`}
                    style={[styles.articlePlanCard, { backgroundColor: theme.control, borderColor: theme.border }]}
                  >
                    <View style={[styles.articlePlanDayBadge, { backgroundColor: theme.secondaryBand }]}>
                      <Text style={[styles.articlePlanDayBadgeText, { color: theme.primary }]}>
                        {row[0]}
                      </Text>
                    </View>
                    <View style={styles.articlePlanItems}>
                      {splitTrainingPlanItems(row[1]).map((item, itemIndex) => (
                        <View key={`${item}-${itemIndex}`} style={styles.articlePlanItemRow}>
                          <View style={[styles.articlePlanBullet, { backgroundColor: theme.primary }]} />
                          <Text style={[styles.articlePlanDescription, { color: theme.text }]}>
                            {item}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            );
          }

          return null;
        })}
      </View>
    </View>
  );
}

