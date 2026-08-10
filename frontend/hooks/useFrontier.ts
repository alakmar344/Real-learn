"use client";

import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useShallow } from "zustand/shallow";
import { useSavedJourneysStore } from "@/store/savedJourneysStore";
import { useProgressStore } from "@/store/progressStore";
import {
  buildFrontier,
  recommendNext,
  findConnections,
  masteryDigest,
  type Frontier,
  type Recommendation,
  type Connections,
} from "@/lib/knowledgeFrontier";

const BACKEND_URL = (
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://real-learn.onrender.com"
).replace(/\/$/, "");

/** A lesson OTHER learners explored that this learner hasn't proven yet. */
export interface DiscoveryCard {
  id?: string;
  title: string;
  summary: string;
  subject: string;
  keyTakeaways: string[];
}

interface DiscoverState {
  loading: boolean;
  error: string | null;
  cards: DiscoveryCard[];
  newTerritory: boolean;
  /** The last goal the learner searched (client-cleaned). */
  goal: string;
  connections: Connections | null;
}

const EMPTY_DISCOVER: DiscoverState = {
  loading: false,
  error: null,
  cards: [],
  newTerritory: false,
  goal: "",
  connections: null,
};

/**
 * The React surface over the on-device knowledge frontier.
 *
 * `frontier` + `recommendations` are computed 100% locally from the learner's
 * quiz-verified journeys — they render instantly, work offline, and never leave
 * the device. `discover(goal)` is the OPTIONAL backend enrichment: it finds
 * related lessons other learners explored, filtered against what this learner
 * has already proven. It degrades gracefully — a failed call just leaves the
 * local frontier as the source of truth.
 */
export function useFrontier() {
  const { getToken } = useAuth();

  const journeys = useSavedJourneysStore((s) => s.journeys);
  const subjectsSeen = useProgressStore(useShallow((s) => s.subjectsSeen));

  const frontier: Frontier = useMemo(
    () => buildFrontier(journeys, subjectsSeen),
    [journeys, subjectsSeen]
  );

  const recommendations: Recommendation[] = useMemo(
    () => recommendNext(frontier, { limit: 6 }),
    [frontier]
  );

  const [discoverState, setDiscoverState] = useState<DiscoverState>(EMPTY_DISCOVER);

  const resetDiscover = useCallback(() => setDiscoverState(EMPTY_DISCOVER), []);

  const discover = useCallback(
    async (goalInput: string) => {
      const goal = (goalInput ?? "").trim();
      // Local, instant analysis of the goal against the proven frontier — this
      // renders even if the network call below fails.
      const connections = findConnections(goal, frontier);

      setDiscoverState({
        ...EMPTY_DISCOVER,
        loading: true,
        goal: connections.goal,
        connections,
      });

      try {
        let token: string | null = null;
        try {
          token = await getToken();
        } catch {
          token = null;
        }
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`${BACKEND_URL}/api/find`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            goal,
            mastered: masteryDigest(frontier, 24),
            limit: 6,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `Request failed (${res.status})`);
        }

        const data = await res.json();
        const cards: DiscoveryCard[] = Array.isArray(data?.discover)
          ? data.discover
          : [];
        setDiscoverState({
          loading: false,
          error: null,
          cards,
          newTerritory: Boolean(data?.newTerritory) || cards.length === 0,
          goal: connections.goal,
          connections,
        });
      } catch (err) {
        // Graceful degradation: keep the local connection analysis, surface a
        // soft note instead of an error wall.
        setDiscoverState({
          loading: false,
          error:
            err instanceof Error ? err.message : "Could not load related lessons.",
          cards: [],
          newTerritory: connections.newTerritory,
          goal: connections.goal,
          connections,
        });
      }
    },
    [frontier, getToken]
  );

  return {
    frontier,
    recommendations,
    discover,
    resetDiscover,
    discoverState,
  };
}
