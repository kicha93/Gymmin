import { describe, expect, it } from "vitest";

import {
  articles,
  getArticleTranslation,
  type Article,
  type LegacyArticle
} from "../articles";

const translatedArticle: Article = {
  defaultLanguage: "pl",
  id: "article-1",
  publishedAt: "2026-06-06",
  readTime: "5 min",
  translations: {
    en: {
      category: "Training",
      content: "English content",
      summary: "English summary",
      title: "English title"
    },
    pl: {
      category: "Trening",
      content: "Polska treść",
      summary: "Polskie podsumowanie",
      title: "Polski tytuł"
    }
  }
};

describe("articles", () => {
  it("includes the progression article in both supported languages", () => {
    const article = articles.find((item) => item.slug === "jak-skutecznie-progresowac-na-treningu");

    expect(article).toBeDefined();
    expect(getArticleTranslation(article!, "pl")).toMatchObject({
      isFallback: false,
      title: "Jak skutecznie progresować na treningu?"
    });
    expect(getArticleTranslation(article!, "en")).toMatchObject({
      isFallback: false,
      title: "How to Progress Effectively in Your Workouts"
    });
  });

  it("includes the sets and repetitions article in both supported languages", () => {
    const article = articles.find((item) => item.slug === "ile-serii-i-powtorzen-wykonywac");

    expect(article).toBeDefined();
    expect(article?.publishedAt).toBe("2026-07-28");
    expect(getArticleTranslation(article!, "pl")).toMatchObject({
      isFallback: false,
      title: "Ile serii i powtórzeń wykonywać?"
    });
    expect(getArticleTranslation(article!, "en")).toMatchObject({
      isFallback: false,
      title: "How Many Sets and Repetitions Should You Do?"
    });
  });

  it("includes the load and training intensity article in both supported languages", () => {
    const article = articles.find((item) => item.slug === "jak-dobrac-ciezar-i-ocenic-intensywnosc");

    expect(article).toBeDefined();
    expect(article?.publishedAt).toBe("2026-07-28");
    expect(getArticleTranslation(article!, "pl")).toMatchObject({
      isFallback: false,
      title: "Jak dobrać ciężar i ocenić intensywność treningu?"
    });
    expect(getArticleTranslation(article!, "en")).toMatchObject({
      isFallback: false,
      title: "How to Choose the Right Load and Assess Training Intensity"
    });
  });

  it("returns the requested language when translation exists", () => {
    expect(getArticleTranslation(translatedArticle, "pl")).toMatchObject({
      content: "Polska treść",
      isFallback: false,
      language: "pl",
      title: "Polski tytuł"
    });

    expect(getArticleTranslation(translatedArticle, "en")).toMatchObject({
      content: "English content",
      isFallback: false,
      language: "en",
      title: "English title"
    });
  });

  it("falls back to the default language when the requested translation is missing", () => {
    const article: Article = {
      ...translatedArticle,
      translations: {
        pl: translatedArticle.translations.pl
      }
    };

    expect(getArticleTranslation(article, "en")).toMatchObject({
      content: "Polska treść",
      isFallback: true,
      language: "pl"
    });
  });

  it("falls back to the first available translation when default translation is missing", () => {
    const article: Article = {
      ...translatedArticle,
      defaultLanguage: "pl",
      translations: {
        en: translatedArticle.translations.en
      }
    };

    expect(getArticleTranslation(article, "pl")).toMatchObject({
      content: "English content",
      isFallback: true,
      language: "en"
    });
  });

  it("returns safe empty content when article has no translations", () => {
    const article: Article = {
      defaultLanguage: "pl",
      id: "empty",
      publishedAt: "2026-06-06",
      readTime: "1 min",
      translations: {}
    };

    expect(getArticleTranslation(article, "pl")).toMatchObject({
      content: "Brak treści artykułu",
      isFallback: true,
      language: "pl",
      title: "Brak treści artykułu"
    });

    expect(getArticleTranslation(article, "en")).toMatchObject({
      content: "No article content available",
      isFallback: true,
      language: "en",
      title: "No article content available"
    });
  });

  it("supports legacy flat article fields", () => {
    const legacy: LegacyArticle = {
      body: "Legacy body",
      category: "Training",
      defaultLanguage: "en",
      id: "legacy",
      title: "Legacy title"
    };

    expect(getArticleTranslation(legacy, "pl")).toMatchObject({
      category: "Training",
      content: "Legacy body",
      isFallback: true,
      language: "en",
      title: "Legacy title"
    });
  });
});
