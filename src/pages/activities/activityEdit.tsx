import { useState } from "react";
import { useParams } from "react-router";
import { useCurrentUser } from "../../hooks/useCurrentUser";

import User from "../../model/User";

import { ActivityFormState } from "../../model/ActivityFormState";
import { WorkRequestFormState } from "../../model/WorkRequestFormState";
import { useActivityEditDetails } from "./hooks/useActivityEditDetails";
import { useActivityEditActions } from "./hooks/useActivityEditActions";
import { ActivityOperations, ActivityOperation } from "../../model/ActivityOperation";
import { ActivityForm } from "../../components/activityForm";
import { WorkRequestMatchDialog } from "../../components/WorkRequestMatchDialog";
import { ActivityValidationResult } from "../../model/ValidationResult";

const pageTitleMap: Record<ActivityOperation, string> = {
  [ActivityOperations.CREATE]: "Dodawanie wykonanej czynności",
  [ActivityOperations.UPDATE]: "Edycja czynności",
  [ActivityOperations.PROMOTE_WORK_REQUEST]: "Wykonane zlecenie"
};

function getPageTitle(operation?: ActivityOperation) {
  return operation ? pageTitleMap[operation] : "??";
}

function ActivityEdit({ users }: { users: Map<string, User> }) {

    const currentUser = useCurrentUser() ?? undefined;
    const { handleSubmit, handleCancel, findMatchingWorkRequests } = useActivityEditActions();
    const { id: objectId, operation } = useParams<{id?: string, operation?: ActivityOperation}>();
    const { activity, setActivity, workRequest, loading, error } = useActivityEditDetails(operation, objectId, currentUser);
    const [validationResult, setValidationResult] = useState<ActivityValidationResult>({});
    const [matchingWorkRequests, setMatchingWorkRequests] = useState<WorkRequestFormState[]>([]);

    if (!currentUser) {
        return <div className="notFoundState">User nie jest załadowany</div>;
    }

    if (operation !== ActivityOperations.CREATE && (!objectId || loading)) {
        return <div className="loadingData">Ładowanie danych</div>;
    }

    if (error) {
        return <div className="errorState">Błąd podczas ładowania danych</div>;
    }

    if (!activity) {
        return <div className="notFoundState">Activity nie jest załadowane</div>;
    }

    function onActivityPropertyChanged<K extends keyof ActivityFormState>(key: K, value: ActivityFormState[K]) {
        setActivity(prev => prev ? { ...prev, [key]: value } : prev);
    }

    function onTemplateButtonClicked(type: string, exp: number) {
        setActivity(prev => prev ? {...prev, type, exp: exp.toString()} : prev);
    }

    const onSubmit = async function(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const newValidationResult = validateInputs(activity);
        setValidationResult(newValidationResult);

        if (hasErrors(newValidationResult)) {
            return;
        }

        if (operation === ActivityOperations.CREATE) {
            const matches = await findMatchingWorkRequests(activity.type);
            if (matches.length > 0) {
                setMatchingWorkRequests(matches);
                return;
            }
        }

        await handleSubmit(activity, workRequest, operation);
    }

    async function onMatchConfirmed(selectedWorkRequest: WorkRequestFormState) {
        setMatchingWorkRequests([]);
        await handleSubmit(activity!, selectedWorkRequest, ActivityOperations.PROMOTE_WORK_REQUEST);
    }

    async function onMatchDeclined() {
        setMatchingWorkRequests([]);
        await handleSubmit(activity!, null, ActivityOperations.CREATE);
    }

    function hasErrors(validationResult: ActivityValidationResult) {
        return Object.keys(validationResult).length > 0
    }

    function onCancel() {
        handleCancel(operation, objectId);
    }

    function validateInputs(form: ActivityFormState): ActivityValidationResult {
        const errors: ActivityValidationResult = {};

        if (!form.user) errors.user = "Wpisz wykonawcę czynności";
        if (!form.type) errors.type = "Wpisz rodzaj czynności";
        if (!form.exp) errors.exp = "Wpisz zdobyte punkty doświadczenia";
        if (!isNaturalNumber(form.exp)) errors.exp = "Punkty doświadczenia muszą być liczbą naturalną";
        return errors;
    }

    function isNaturalNumber(value: string): boolean {
        return /^\d+$/.test(value);
    }

    return <>
        <h2 className="pageTitle" data-testid="activity-edit-page" data-mode={operation}>{getPageTitle(operation)}</h2>
        <ActivityForm
            activity={activity}
            users={users}
            validationResult={validationResult}
            onTemplateButtonClicked={onTemplateButtonClicked}
            onActivityPropertyChanged={onActivityPropertyChanged}
            onSubmit={onSubmit}
            onCancel={onCancel}
        />
        <WorkRequestMatchDialog
            isOpen={matchingWorkRequests.length > 0}
            matchingWorkRequests={matchingWorkRequests}
            users={users}
            onConfirm={onMatchConfirmed}
            onCancel={onMatchDeclined}
            onDismiss={() => setMatchingWorkRequests([])}
        />
    </>
}

export default ActivityEdit;