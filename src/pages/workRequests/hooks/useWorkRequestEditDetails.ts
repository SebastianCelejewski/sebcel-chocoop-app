import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../../../amplify/data/resource";
import type { WorkRequestFormState } from "../../../model/WorkRequestFormState";
import { AuthUser } from "aws-amplify/auth";
import { WorkRequestOperations, WorkRequestOperation } from "../../../model/WorkRequestOperation";
import { mapWorkRequestModelToWorkRequestFormState } from "../../../model/mappers/workRequestMapper";
import { getCurrentDate } from "../../../utils/dateUtils";

const client = generateClient<Schema>();

export function useWorkRequestEditDetails(operation?: WorkRequestOperation, workRequestId?: string, currentUser?: AuthUser) {

  const [workRequest, setWorkRequest] = useState<WorkRequestFormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!operation || !currentUser) {
      setWorkRequest(null);
      setLoading(false);
      return;
    }

    if ((operation === WorkRequestOperations.UPDATE) && !workRequestId) {
      setWorkRequest(null);
      setLoading(false);
      return;
    }

    let aborted = false;

    const createEmptyWorkRequest = function () {
      setWorkRequest({
        createdDate: getCurrentDate(),
        createdBy: currentUser.userId,
        type: "",
        exp: "",
        urgency: "",
        instructions: "",
        completed: false,
        completedAs: undefined
      });
      setLoading(false);
      setError(null);
    }

    const loadWorkRequest = async function(id: string) {
      try {
        setLoading(true);
        setError(null);

        const { data } = await client.models.WorkRequest.get({ id: id });
        if (!aborted) setWorkRequest(mapWorkRequestModelToWorkRequestFormState(data));
      } catch (err) {
        if (!aborted) setError(err as Error);
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    if (operation === WorkRequestOperations.CREATE) {
      createEmptyWorkRequest();
    } else if (operation === WorkRequestOperations.UPDATE) {
      if (!workRequestId) {
        throw new Error("Argument workRequestId is missing");
      }
      loadWorkRequest(workRequestId);
    } else {
      throw new Error("Unsupported operation: " + operation);
    }

    return () => {
      aborted = true;
    };
  }, [workRequestId, operation, currentUser]);

  return { workRequest, setWorkRequest, loading, error };
}