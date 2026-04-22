import { useState } from "react";
import { useParams } from "react-router";
import { useCurrentUser } from "../../hooks/useCurrentUser"

import User from "../../model/User";

import { WorkRequestFormState } from "../../model/WorkRequestFormState";
import { useWorkRequestEditDetails } from "./hooks/useWorkRequestEditDetails"
import { useWorkRequestEditActions } from "./hooks/useWorkRequestEditActions"
import { WorkRequestOperations, WorkRequestOperation } from "../../model/WorkRequestOperation";
import { WorkRequestForm } from "../../components/workRequestForm";
import { WorkRequestValidationResult } from "../../model/ValidationResult";

const pageTitleMap: Record<WorkRequestOperation, string> = {
  [WorkRequestOperations.CREATE]: "Dodawanie zlecenia",
  [WorkRequestOperations.UPDATE]: "Edycja zlecenia"
};

function getPageTitle(operation?: WorkRequestOperation) {
  return operation ? pageTitleMap[operation] : "??";
}

function WorkRequestEdit({users}: {users: Map<string, User>}) {

    const currentUser = useCurrentUser() ?? undefined;
    const { handleSubmit, handleCancel } = useWorkRequestEditActions();
    const { id: workRequestId, operation } = useParams<{id?: string, operation?: WorkRequestOperation}>();
    const { workRequest, setWorkRequest, loading, error } = useWorkRequestEditDetails(operation, workRequestId, currentUser);
    const [validationResult, setValidationResult] = useState<WorkRequestValidationResult>({});

    if (!currentUser) {
        return <div className="notFoundState">User nie jest załadowany</div>;
    }

    if (operation !== WorkRequestOperations.CREATE && (!workRequestId || loading)) {
        return <div className="loadingData">Ładowanie danych</div>;
    }

    if (error) {
        return <div className="errorState">Błąd podczas ładowania danych</div>;
    }

    if (!workRequest) {
        return <div className="notFoundState">Zlecenie nie jest załadowane</div>;
    }


    function onWorkRequestPropertyChanged<K extends keyof WorkRequestFormState>(key: K, value: WorkRequestFormState[K]) {
        setWorkRequest(prev => prev ? { ...prev, [key]: value } : prev);
    }

    function onTemplateButtonClicked(type: string, exp: number) {
        setWorkRequest(prev => prev ? {...prev, type, exp: exp.toString()} : prev);
    }

    const onSubmit = async function(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const newValidationResult = validateInputs(workRequest);
        setValidationResult(newValidationResult);

        if (hasErrors(newValidationResult)) {
            console.log(JSON.stringify(newValidationResult));
            return;
        }

        await handleSubmit(workRequest, operation);
    }

    function hasErrors(validationResult: WorkRequestValidationResult): boolean {
        return Object.keys(validationResult).length > 0
    }

    function onCancel() {
        handleCancel(operation, workRequestId);
    }

    function validateInputs(form: WorkRequestFormState): WorkRequestValidationResult {
        const errors: WorkRequestValidationResult = {};

        if (!form.createdDate) errors.createdDate = "Wpisz datę utworzenia zlecenia";
        if (!form.createdBy) errors.createdBy = "Wpisz zleceniodawcę";
        if (!form.type) errors.type = "Wpisz rodzaj czynności";
        if (!form.exp) errors.exp = "Wpisz punkty doświadczenia do zdobycia";
        if (!isNaturalNumber(form.exp)) errors.exp = "Punkty doświadczenia muszą być liczbą naturalną";
        return errors;
    }

    function isNaturalNumber(value: string): boolean {
        return /^\d+$/.test(value);
    }

    return <>
        <h2 className="pageTitle" data-testid="work-request-edit-page" data-mode={operation}>{getPageTitle(operation)}</h2>
        <WorkRequestForm
            workRequest={workRequest}
            users={users}
            validationResult={validationResult}
            onTemplateButtonClicked={onTemplateButtonClicked}
            onWorkRequestPropertyChanged={onWorkRequestPropertyChanged}
            onSubmit={onSubmit}
            onCancel={onCancel}
        />
    </>
}

export default WorkRequestEdit;
