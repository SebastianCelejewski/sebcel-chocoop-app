import type { Schema } from "../../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import reportError from "../utils/reportError"
import { ActivityFormState} from "../model/ActivityFormState";
import { OperationResult } from "../model/OperationResult";
import { success, failure } from "../model/OperationResult";
import { createActivityObjectFromState} from "../model/mappers/activityMapper";

export default function ActivityService() {
    
    const client = generateClient<Schema>();

    class ReactionsQueryResult {
        items: Array<Schema["Reaction"]["type"]> = []
    }

    async function createActivity(activity: ActivityFormState): Promise<OperationResult> {
        const newActivity = createActivityObjectFromState(activity);

        try {
            const createActivityResponse = await client.models.Activity.create(newActivity)

            if (createActivityResponse.errors?.length) {
                return failure("Failed to create a new activity in the database", createActivityResponse.errors);
            }
            if (!createActivityResponse.data) {
                return failure("Failed to create a new activity in the database", "No activity id was returned");
            }

            const activityId = createActivityResponse.data.id;
            return success(activityId);
        }
        catch(error) {
            return failure("Failed to create a new activity in the database", error);
        }
    }

    async function updateActivity(activity: ActivityFormState): Promise<OperationResult>
    {
        const updatedActivity = createActivityObjectFromState(activity);
        if (updatedActivity.id === undefined) {
            throw new Error(reportError("State activityId is undefined during creation of a new activity object"))
        }

        try {
            const updateActivityResponse = await client.models.Activity.update({ ...updatedActivity, id: updatedActivity.id })
            if (updateActivityResponse.errors?.length) {
                return failure("Failed to update an activity in the database", updateActivityResponse.errors);
            }
            return success(activity.id!);
        } catch(error) {
            return failure("Failed to update an activity in the database", error);
        }
    }

    async function getActivity(id: string): Promise<Schema["Activity"]["type"] | null> {
        try {
            const { data, errors } = await client.models.Activity.get({ id });
            if (errors?.length) {
                throw errors;
            }
            return data ?? null;
        } catch(error) {
            throw new Error(reportError("Failed to fetch an activity from the database", error));
        }
    }

async function getActivitiesPage(
        selectedUser?: string,
        nextToken?: string | null,
        limit: number = 20
    ) {
        try {
            if (selectedUser) {
                return await client.models.Activity.listActivityByUserAndDate(
                    {
                        user: selectedUser
                    },
                    {
                        sortDirection: "DESC",
                        limit,
                        nextToken: nextToken ?? undefined
                    }
                );
            }

            return await client.models.Activity.listActivityByScopeAndDate(
                {
                    scope: "ALL"
                },
                {
                    sortDirection: "DESC",
                    limit,
                    nextToken: nextToken ?? undefined
                }
            );

        } catch (error) {
            throw new Error(reportError("Failed to fetch activities page", error));
        }
    }

    function observeReactions(onChange: (reactions: Array<Schema["Reaction"]["type"]>) => void) {
        const reactionsQuery = client.models.Reaction.observeQuery().subscribe({
            next: (data: ReactionsQueryResult) => {
                onChange(data.items);
            }
        });

        return () => {
            reactionsQuery.unsubscribe();
        }
    }

    async function deleteActivity(id: string): Promise<OperationResult> {
        try {
            const deleteActivityResponse = await client.models.Activity.delete({ id });
            if (deleteActivityResponse.errors?.length) {
                return failure("Failed to delete an activity from the database", deleteActivityResponse.errors);
            }
            return success(id);
        } catch(error) {
            return failure("Failed to delete an activity from the database", error);
        }
    }

    async function addReaction(activityId: string, userId: string, reaction: string): Promise<OperationResult> {
        try {
            const createReactionResponse = await client.models.Reaction.create({ activityId: activityId, user: userId, reaction: reaction});
            if (createReactionResponse.errors?.length || !createReactionResponse.data) {
                return failure("Failed to add a reaction for an activity in the database", createReactionResponse.errors);
            }
            const reactionId = createReactionResponse.data.id;
            return success(reactionId);
        } catch (error) {
            return failure("Failed to create a reaction for an activity in the database", error);
        }
    }

    return {
        createActivity,
        updateActivity,
        deleteActivity,
        getActivity,
        getActivitiesPage,
        addReaction,
        observeReactions
    }
}
