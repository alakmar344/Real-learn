"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  registerScopeSwitchStores,
  switchUserScope,
} from "@/lib/userScopedStorage";
import { useLessonStore } from "@/store/lessonStore";
import { useProgressStore } from "@/store/progressStore";
import { useSavedJourneysStore } from "@/store/savedJourneysStore";
import { usePreferenceStore } from "@/store/preferenceStore";
import { DEFAULT_LEARNING_PREFERENCES } from "@/lib/personalization";

export default function AuthScopeSync() {
  const { isLoaded, userId } = useAuth();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      registerScopeSwitchStores({
        resetLesson: () => {
          try {
            useLessonStore.getState().resetAll();
          } catch {
            // ignore
          }
        },
        resetProgress: () => {
          try {
            useProgressStore.getState().resetEngagement();
          } catch {
            // ignore
          }
        },
        resetJourneys: () => {
          try {
            useSavedJourneysStore.setState({ journeys: [] });
          } catch {
            // ignore
          }
        },
        resetPersonalization: () => {
          try {
            usePreferenceStore.getState().setPersonalization(DEFAULT_LEARNING_PREFERENCES);
          } catch {
            // ignore
          }
        },
        rehydrateAll: () => {
          try {
            void useSavedJourneysStore.persist?.rehydrate?.();
            void useProgressStore.persist?.rehydrate?.();
            void useLessonStore.persist?.rehydrate?.();
            void usePreferenceStore.persist?.rehydrate?.();
          } catch {
            // ignore
          }
        },
      });
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    switchUserScope(userId);
  }, [isLoaded, userId]);

  return null;
}
