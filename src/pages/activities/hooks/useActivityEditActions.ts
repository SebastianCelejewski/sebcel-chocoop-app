import { ActivityFormState } from "../../../model/ActivityFormState";
import { WorkRequestFormState } from "../../../model/WorkRequestFormState";
import { useNavigate } from "react-router";
import { ActivityOperations, ActivityOperation } from "../../../model/ActivityOperation";
import reportError from "../../../utils/reportError";
import { OperationResult } from "../../../model/OperationResult";
import ActivityService from "../../../services/ActivityService";
import WorkRequestService from "../../../services/WorkRequestService";
import WorkRequestPromotionUseCase from "../../../use_cases/WorkRequestPromotionUseCase";

export function useActivityEditActions() {

    const navigate = useNavigate();
    const activityService = ActivityService();
    const workRequestService = WorkRequestService();
    const workServicePromotionUseCase = WorkRequestPromotionUseCase();

    async function handleSubmit(
        activity: ActivityFormState,
        workRequest: WorkRequestFormState | null,
        operationParam: ActivityOperation | undefined
    ) {
        switch(operationParam) {
            case ActivityOperations.CREATE:
                handleResult(
                    await activityService.createActivity(activity),
                    () => navigate("/ActivityList")
                );
                break;
            case ActivityOperations.UPDATE:
                handleResult(
                    await activityService.updateActivity(activity),
                    () => navigate("/ActivityDetails/" + activity.id)
                );
                break;
            case ActivityOperations.PROMOTE_WORK_REQUEST:
                handleResult(
                    await workServicePromotionUseCase.promoteWorkRequest(activity, workRequest!),
                    () => navigate("/ActivityList")
                );
                break;
        }
    }

    function handleCancel(operation: ActivityOperation | undefined, objectId: string | undefined) {
        if (operation === ActivityOperations.CREATE) {
            navigate("/ActivityList")
        } else if (operation === ActivityOperations.PROMOTE_WORK_REQUEST) {
            navigate("/WorkRequestDetails/" + objectId)
        } else {
            navigate("/ActivityDetails/" + objectId)
        }
    }

    function handleResult(result: OperationResult, onSuccess: () => void) {
        if (result.success) {
            onSuccess();
        } else {
            throw new Error(reportError(result.message, result.details));
        }
    }

    async function findMatchingWorkRequests(activityType: string): Promise<WorkRequestFormState[]> {
        return workRequestService.findMatchingWorkRequests(activityType);
    }

    return { handleSubmit, handleCancel, findMatchingWorkRequests }
}