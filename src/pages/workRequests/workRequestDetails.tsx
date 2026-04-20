import type { Schema } from "../../../amplify/data/resource";

import { NavLink, useParams } from "react-router";
import User from "../../model/User";
import { dateToString } from "../../utils/dateUtils";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useWorkRequestDetails } from "./hooks/useWorkRequestDetails";
import { useWorkRequestActions } from "./hooks/useWorkRequestActions";

import { urgencyList } from "../../model/Urgency";



function WorkRequestDetails({users}: {users: Map<string, User>}) {
    const { id: workRequestId } = useParams();
    const currentUser = useCurrentUser();
    const {workRequest, loading, error } = useWorkRequestDetails(workRequestId ?? null);
    const { handleBack, handleEdit, handleDelete, handleDone, dialog } = useWorkRequestActions();

  

    if (!workRequestId || loading) {
        return <div className="loadingData">Ładowanie danych</div>;
    }

    if (error) {
        return <div className="errorState">Błąd podczas ładowania danych</div>;
    }

    if (!workRequest) {
        return <div className="notFoundState">Activity nie jest załadowane</div>;
    }

    if (!currentUser) {
        return <div className="notFoundState">User nie jest załadowany</div>;
    }


    if (workRequest === undefined) {
        return <>
            <nav>
                <NavLink to="/WorkRequestList" end>Powrót na listę zleceń</NavLink>
            </nav>
            {dialog}
        </>;
    }

    return <>
        <h2 className="pageTitle" data-testid="work-request-details-page">Szczegóły zlecenia</h2>
        <div className="entryDetails">
            <p className="label">Data utworzenia zlecenia</p>
            <p data-testid="work-request-created-date">{dateToString(workRequest.createdDate)}</p>

            <p className="label">Twórca zlecenia</p>
            <p data-testid="work-request-created-by">{users.get(workRequest.createdBy)?.nickname}</p>

            <p className="label">Status</p>
            <WorkRequestCompletness workRequest={workRequest}/>

            <p className="label">Rodzaj aktywności</p>
            <p data-testid="work-request-type">{workRequest.type}</p>

            <p className="label">Punkty doświadczenia do zdobycia</p>
            <p data-testid="work-request-exp">{workRequest.exp}</p>

            <p className="label">Pilność</p>
            <p data-testid="work-request-urgency">{urgencyList[workRequest.urgency].label}</p>

            <p className="label">Instrukcje</p>
            <p data-testid="work-request-instructions" className="commentTextArea">{workRequest.instructions}</p>
        </div>
        <div>
            <button data-testid="back-button" type="button" onClick={handleBack}>Wróć</button>
            <button data-testid="edit-button" type="button" onClick={() => handleEdit(workRequestId)}>Edytuj</button>
            <button data-testid="done-button" type="button" onClick={() => handleDone(workRequestId)} disabled={workRequest.completed}>Zrobione</button>
            <button data-testid="delete-button" type="button" onClick={() => handleDelete(workRequestId)}>Usuń</button>
        </div>
        {dialog}
    </>;
}

function WorkRequestCompletness({ workRequest }: { workRequest: Schema["WorkRequest"]["type"]}) {
    if (workRequest.completed) {
        const linkTarget = "/ActivityDetails/" + workRequest.completedAs;
        return <p data-testid="work-request-completed-message">Zlecenie wykonane. <NavLink to={linkTarget}>Przejdź do czynności</NavLink></p>;
    }

    return <p data-testid="work-request-pending-message">Zlecenie niewykonane</p>;
}


export default WorkRequestDetails;
