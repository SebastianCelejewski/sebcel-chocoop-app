import type { Schema } from "../../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import reportError from "../utils/reportError"
import { WorkRequestFormState} from "../model/WorkRequestFormState";
import { OperationResult } from "../model/OperationResult";
import { success, failure } from "../model/OperationResult";
import { mapWorkRequestFormStateToWorkRequestModel } from "../model/mappers/workRequestMapper";

export default function WorkRequestService() {
    
    const client = generateClient<Schema>();

    class WorkRequestQueryResult {
        items: Array<Schema["WorkRequest"]["type"]> = []
    }

    async function createWorkRequest(workRequest: WorkRequestFormState): Promise<OperationResult> {
        const newWorkRequest = mapWorkRequestFormStateToWorkRequestModel(workRequest);

        try {
            const createWorkRequestResponse = await client.models.WorkRequest.create(newWorkRequest)

            if (createWorkRequestResponse.errors?.length) {
                return failure("Failed to create a new workrequest in the database", createWorkRequestResponse.errors);
            }
            if (!createWorkRequestResponse.data) {
                return failure("Failed to create a new workrequest in the database", "No WorkRequest id was returned");
            }

            const workRequestId = createWorkRequestResponse.data.id;
            return success(workRequestId);
        }
        catch(error) {
            return failure("Failed to create a new work request in the database", error);
        }
    }

    async function updateWorkRequest(workRequest: WorkRequestFormState): Promise<OperationResult>
    {
        const updatedWorkRequest = mapWorkRequestFormStateToWorkRequestModel(workRequest);
        if (updatedWorkRequest.id === undefined) {
            throw new Error(reportError("State workrequestId is undefined during creation of a new workrequest object"))
        }

        try {
            const updateWorkRequestResponse = await client.models.WorkRequest.update({ ...updatedWorkRequest, id: updatedWorkRequest.id })
            if (updateWorkRequestResponse.errors?.length) {
                return failure("Failed to update an workrequest in the database", updateWorkRequestResponse.errors);
            }
            return success(workRequest.id!);
        } catch(error) {
            return failure("Failed to update an work request in the database", error);
        }
    }

    async function getWorkRequest(id: string): Promise<Schema["WorkRequest"]["type"] | null> {
        try {
            const { data, errors } = await client.models.WorkRequest.get({ id });
            if (errors?.length) {
                throw errors;
            }
            return data ?? null;
        } catch(error) {
            throw new Error(reportError("Failed to fetch a work request from the database", error));
        }
    }

    function observeWorkRequests(onChange: (workRequests: Array<Schema["WorkRequest"]["type"]>) => void) {
        const workRequestsQuery = client.models.WorkRequest.observeQuery().subscribe({
            next: (data: WorkRequestQueryResult) => {
                onChange(data.items);
            }
        });

        return () => {
            workRequestsQuery.unsubscribe();
        };
    }

    async function deleteWorkRequest(id: string): Promise<OperationResult> {
        try {
            const deleteWorkRequestResponse = await client.models.WorkRequest.delete({ id });
            if (deleteWorkRequestResponse.errors?.length) {
                return failure("Failed to delete a work  request from the database", deleteWorkRequestResponse.errors);
            }
            return success(id);
        } catch(error) {
            return failure("Failed to delete a workrequest from the database", error);
        }
    }

    return {
        deleteWorkRequest,
        createWorkRequest,
        getWorkRequest,
        observeWorkRequests,
        updateWorkRequest
    }
}
