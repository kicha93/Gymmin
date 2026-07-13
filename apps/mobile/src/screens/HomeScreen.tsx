import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { AppButton } from "../components/AppControls";
import { CollapsiblePanel } from "../components/CollapsiblePanel";
import { WorkoutList } from "../components/WorkoutList";
import { articles, getArticleTranslation, type Article } from "../domain/articles";
import type { SavedWorkout } from "../domain/savedWorkouts";
import { hasUserDefinedWorkouts } from "../domain/workouts";
import type { LanguageCode, TranslationKey } from "../i18n/translations";
import { formatArticleDate } from "./ArticleDetailScreen";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type HomeScreenProps = {
  activeSessionCard: ReactNode;
  authPanel: ReactNode;
  collapsedPanels: Record<string, boolean>;
  filteredWorkouts: SavedWorkout[];
  language: LanguageCode;
  onOpenAllWorkouts: () => void;
  onOpenArticle: (articleId: Article["id"]) => void;
  onOpenWorkout: (workoutId: string) => void;
  onTogglePanel: (panelId: string) => void;
  savedWorkouts: SavedWorkout[];
  systemStatusCallout: ReactNode;
  t: (key: TranslationKey) => string;
  theme: Theme;
  trainingFactPill: ReactNode;
  weeklyPlanCard: ReactNode;
  workoutCreatorButton: ReactNode;
  workoutSortActions: ReactNode;
};

export function HomeScreen({
  activeSessionCard,
  authPanel,
  collapsedPanels,
  filteredWorkouts,
  language,
  onOpenAllWorkouts,
  onOpenArticle,
  onOpenWorkout,
  onTogglePanel,
  savedWorkouts,
  systemStatusCallout,
  t,
  theme,
  trainingFactPill,
  weeklyPlanCard,
  workoutCreatorButton,
  workoutSortActions
}: HomeScreenProps) {
  const homeWorkouts = filteredWorkouts.slice(0, 5);
  const shouldShowWorkoutCreator = !hasUserDefinedWorkouts(savedWorkouts);

  return (
    <>
      {authPanel}
      {systemStatusCallout}
      {activeSessionCard}
      {weeklyPlanCard}
      {trainingFactPill}
      {shouldShowWorkoutCreator ? workoutCreatorButton : null}

      <CollapsiblePanel
        actions={workoutSortActions}
        isCollapsed={collapsedPanels["home-workouts"] ?? false}
        theme={theme}
        title={t("workouts")}
        onToggle={() => onTogglePanel("home-workouts")}
      >
        <WorkoutList workouts={homeWorkouts} theme={theme} onOpenWorkout={onOpenWorkout} />
        {filteredWorkouts.length > homeWorkouts.length ? (
          <AppButton
            icon="list-outline"
            style={styles.secondaryButton}
            textStyle={styles.secondaryButtonText}
            theme={theme}
            variant="outline"
            onPress={onOpenAllWorkouts}
          >
            {t("viewAllWorkouts")}
          </AppButton>
        ) : null}
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
