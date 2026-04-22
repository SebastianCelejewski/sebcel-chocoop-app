import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../../../amplify/data/resource";
import type { ActivityFormState } from "../../../model/ActivityFormState";
import { WorkRequestFormState } from "../../../model/WorkRequestFormState";
import { AuthUser } from "aws-amplify/auth";
import { ActivityOperations, ActivityOperation } from "../../../model/ActivityOperation";
import { activityModelToActivityFormState} from "../../../model/mappers/activityMapper";
import { workRequestModelToActivityFormState} from "../../../model/mappers/workRequestPromotionMapper";
import { mapWorkRequestModelToWorkRequestFormState } from "../../../model/mappers/workRequestMapper";
import { getCurrentDate } from "../../../utils/dateUtils";

const client = generateClient<Schema>();

export function useActivityEditDetails(operation?: ActivityOperation, objectId?: string, currentUser?: AuthUser) {

  const [activity, setActivity] = useState<ActivityFormState | null>(null);
  const [workRequest, setWorkRequest] = useState<WorkRequestFormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!operation || !currentUser) {
      setActivity(null);
      setWorkRequest(null);
      setLoading(false);
      return;
    }

    if ((operation === ActivityOperations.UPDATE || operation === ActivityOperations.PROMOTE_WORK_REQUEST) && !objectId) {
      setActivity(null);
      setWorkRequest(null);
      setLoading(false);
      return;
    }

    let aborted = false;

    const createEmptyActivity = function () {
      const emptyActivity = {
        date: getCurrentDate(),
        user: currentUser.userId,
        type: "",
        exp: "",
        scope: "ALL",
        comment: "",
        requestedAs: undefined
      }
      console.log("Creating empty activity with the following data: ", JSON.stringify(emptyActivity));
      setActivity(emptyActivity);
      setLoading(false);
      setError(null);
    }

    const loadActivity = async function(id: string) {
      try {
        setLoading(true);
        setError(null);

        const { data } = await client.models.Activity.get({ id: id });
        if (!aborted) setActivity(activityModelToActivityFormState(data));
      } catch (err) {
        if (!aborted) setError(err as Error);
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    const loadWorkRequest = async function(id: string, currentUser: AuthUser) {
      try {
        setLoading(true);
        setError(null);

        const { data } = await client.models.WorkRequest.get({ id: id });
        if (!aborted) {
          setActivity(workRequestModelToActivityFormState(data, currentUser));
          setWorkRequest(mapWorkRequestModelToWorkRequestFormState(data));
        }
      } catch (err) {
        if (!aborted) setError(err as Error);
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    if (operation === ActivityOperations.CREATE) {
      createEmptyActivity();
    } else if (operation === ActivityOperations.UPDATE) {
      if (!objectId) {
        throw new Error("Argument objectId is missing");
      }
      loadActivity(objectId);
    } else if (operation === ActivityOperations.PROMOTE_WORK_REQUEST) {
      if (!objectId) {
        throw new Error("Argument objectId is missing");
      }
      loadWorkRequest(objectId, currentUser);
    } else {
      throw new Error("Unsupported operation: " + operation);
    }

    return () => {
      aborted = true;
    };
  }, [objectId, operation, currentUser]);

  return { activity, setActivity, workRequest, loading, error };
}