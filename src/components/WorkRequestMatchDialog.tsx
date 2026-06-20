import { useState } from "react";
import { WorkRequestFormState } from "../model/WorkRequestFormState";
import { urgencyList } from "../model/Urgency";
import { dateToString } from "../utils/dateUtils";
import User from "../model/User";

type Props = {
    isOpen: boolean;
    matchingWorkRequests: WorkRequestFormState[];
    users: Map<string, User>;
    onConfirm: (workRequest: WorkRequestFormState) => void;
    onCancel: () => void;
    onDismiss: () => void;
};

export function WorkRequestMatchDialog({ isOpen, matchingWorkRequests, users, onConfirm, onCancel, onDismiss }: Props) {
    const [selectedId, setSelectedId] = useState<string | null>(null);

    if (!isOpen) return null;

    const selected = matchingWorkRequests.find(wr => wr.id === selectedId) ?? null;

    function handleConfirm() {
        if (selected) onConfirm(selected);
    }

    return (
        <div className="dialogBackdrop">
            <div data-testid="work-request-match-dialog" className="dialog">
                <p>Znaleziono pasujące zlecenia. Czy ta aktywność realizuje jedno z nich? Wybierz zlecenie lub pomiń.</p>
                <div className="workRequestMatchList">
                    {matchingWorkRequests.map(wr => (
                        <div
                            key={wr.id}
                            data-testid="work-request-match-item"
                            className={`workRequestMatchItem${selectedId === wr.id ? " selected" : ""}`}
                            onClick={() => setSelectedId(wr.id ?? null)}
                        >
                            <p><strong>Data utworzenia:</strong> {dateToString(wr.createdDate)}</p>
                            <p><strong>Twórca:</strong> {users.get(wr.createdBy)?.nickname ?? wr.createdBy}</p>
                            <p><strong>Pilność:</strong> {urgencyList[Number(wr.urgency)]?.label}</p>
                            <p><strong>Punkty doświadczenia:</strong> {wr.exp}</p>
                            <p><strong>Instrukcje:</strong> {wr.instructions}</p>
                        </div>
                    ))}
                </div>
                <div className="dialogButtonContainer">
                    <button data-testid="confirm-button" onClick={handleConfirm} disabled={selected === null}>Zatwierdź</button>
                    <button data-testid="skip-button" onClick={onCancel}>Pomiń</button>
                    <button data-testid="dismiss-button" onClick={onDismiss}>Anuluj</button>
                </div>
            </div>
        </div>
    );
}
