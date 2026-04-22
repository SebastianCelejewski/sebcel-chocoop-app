import { useEffect, useState, useCallback } from "react";
import type { Schema } from "../../../../amplify/data/resource";
import type { UIReaction } from "../../../model/UIReaction";
import ActivityService from "../../../services/ActivityService";

const activityService = ActivityService();

export function useActivityListDetails() {

    const [activities, setActivities] = useState<Array<Schema["Activity"]["type"]>>([]);
    const [reactions, setReactions] = useState<Array<UIReaction>>([]);

    const [selectedUser, setSelectedUser] = useState<string | undefined>(undefined);

    const [nextToken, setNextToken] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);

    const loadInitial = useCallback(async () => {
        setLoading(true);

        try {
            const result = await activityService.getActivitiesPage(
                selectedUser,
                null,
                20
            );

            setActivities(result.data ?? []);
            setNextToken(result.nextToken ?? null);
            setHasMore(!!result.nextToken);

        } finally {
            setLoading(false);
        }
    }, [selectedUser]);

    const loadMore = useCallback(async () => {
        if (loading || !hasMore) {
            return;
        }

        setLoading(true);

        try {
            const result = await activityService.getActivitiesPage(
                selectedUser,
                nextToken,
                20
            );

            setActivities(prev => [
                ...prev,
                ...(result.data ?? [])
            ]);

            setNextToken(result.nextToken ?? null);
            setHasMore(!!result.nextToken);

        } finally {
            setLoading(false);
        }

    }, [selectedUser, nextToken, loading, hasMore]);

    useEffect(() => {
        loadInitial();
    }, [loadInitial]);

    useEffect(() => {
        const unsubscribe = activityService.observeReactions((items) => {

            const mappedItems: Array<UIReaction> = items.map(reaction => ({
                id: reaction.id,
                reaction: reaction.reaction,
                user: reaction.user,
                activityId: reaction.activityId
            }));

            setReactions(mappedItems);
        });

        return unsubscribe;

    }, []);

    function changeUser(user?: string) {
        setActivities([]);
        setNextToken(null);
        setHasMore(true);
        setSelectedUser(user);
    }

    return {
        activities,
        reactions,
        loading,
        hasMore,
        selectedUser,
        setUser: changeUser,
        loadMore
    };
}