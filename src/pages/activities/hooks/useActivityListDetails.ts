import { useEffect, useState } from "react";
import type { Schema } from "../../../../amplify/data/resource";
import type { UIReaction } from "../../../model/UIReaction";
import ActivityService from "../../../services/ActivityService";

const activityService = ActivityService();

export function useActivityListDetails() {

    const [activities, setActivities] = useState<Array<Schema["Activity"]["type"]>>([]);
    const [reactions, setReactions] = useState<Array<UIReaction>>([]);

    useEffect(() => {
        activityService.observeActivities((items) => {
            setActivities(sortByDateTime([...items]));
        });

        activityService.observeReactions((items) => {
            const mappedItems : Array<UIReaction> = items.map(reaction => (
                {
                    id: reaction.id,
                    reaction: reaction.reaction,
                    user: reaction.user,
                    activityId: reaction.activityId
                }));
            setReactions(mappedItems);
        })
    }, []);

    return { activities, reactions }
}

function sortByDateTime(activities: Array<Schema["Activity"]["type"]>) {
    return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}