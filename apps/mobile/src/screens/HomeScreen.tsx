import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { CollapsiblePanel } from "../components/CollapsiblePanel";
import { WorkoutList } from "../components/WorkoutList";
import { articles, getArticleTranslation, type Article } from "../domain/articles";
import type { SavedWorkout } from "../domain/savedWorkouts";
import type { LanguageCode, TranslationKey } from "../i18n/translations";
import { formatArticleDate } from "./ArticleDetailScreen";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type HomeScreenProps = {
  activeSessionCard: ReactNode;
  collapsedPanels: Record<string, boolean>;
  activeWeeklyWorkouts: SavedWorkout[];
  language: LanguageCode;
  onOpenArticle: (articleId: Article["id"]) => void;
  onOpenWorkout: (workoutId: string) => void;
  onTogglePanel: (panelId: string) => void;
  t: (key: TranslationKey) => string;
  theme: Theme;
  trainingFactPill: ReactNode;
  weeklyPlanCard: ReactNode;
  workoutCreatorButton: ReactNode;
  workoutSortActions: ReactNode;
};

export function HomeScreen({
  activeSessionCard,
  collapsedPanels,
  activeWeeklyWorkouts,
  language,
  onOpenArticle,
  onOpenWorkout,
  onTogglePanel,
  t,
  theme,
  trainingFactPill,
  weeklyPlanCard,
  workoutCreatorButton,
  workoutSortActions
}: HomeScreenProps) {
  return (
    <>
      {activeSessionCard}
      {weeklyPlanCard}
      {trainingFactPill}
      {workoutCreatorButton}

      <CollapsiblePanel
        actions={workoutSortActions}
        isCollapsed={collapsedPanels["home-workouts"] ?? false}
        theme={theme}
        title={t("activeWorkouts")}
        onToggle={() => onTogglePanel("home-workouts")}
      >
        <WorkoutList
          emptyContent={(
            <Text style={[styles.workoutEmptyText, { color: theme.muted }]}>
              {t("noActiveWeeklyWorkouts")}
            </Text>
          )}
          workouts={activeWeeklyWorkouts}
          theme={theme}
          onOpenWorkout={onOpenWorkout}
        />
      </CollapsiblePanel>

      <CollapsiblePanel
        isCollapsed={collapsedPanels["home-articles"] ?? false}
        theme={theme}
        title={t("articles")}
        onToggle={() => onTogglePanel("home-articles")}
      >
        {articles.map((article, index) => {
          const translation = getArticleTranslation(article, language);
          return (
            <Pressable
              key={article.id}
              accessibilityRole="button"
              style={[
                styles.articleRow,
                {
                  borderBottomWidth: index === articles.length - 1 ? 0 : 1,
                  borderColor: theme.border
                }
              ]}
              onPress={() => onOpenArticle(article.id)}
            >
              <View style={styles.articleContent}>
                <Text style={[styles.articleCategory, { color: theme.primary }]}>
                  {translation.category}
                </Text>
                <Text style={[styles.articleTitle, { color: theme.text }]}>{translation.title}</Text>
                {translation.summary ? (
                  <Text style={[styles.articleMeta, { color: theme.muted }]} numberOfLines={2}>
                    {translation.summary}
                  </Text>
                ) : null}
                <Text style={[styles.articleMeta, { color: theme.muted }]}>
                  {formatArticleDate(article.publishedAt, language)} · {article.readTime}
                </Text>
              </View>
              <Ionicons name="reader-outline" size={22} color={theme.primary} />
            </Pressable>
          );
        })}
      </CollapsiblePanel>
    </>
  );
}
