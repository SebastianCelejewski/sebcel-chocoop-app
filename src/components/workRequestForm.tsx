import User from "../model/User";
import { WorkRequestFormState } from "../model/WorkRequestFormState";
import TemplateButtons from "./templateButtons";
import { WorkRequestValidationResult } from "../model/ValidationResult";
import { Urgency, urgencyList } from "../model/Urgency"

export function WorkRequestForm(
    {
        workRequest,
        users,
        validationResult,
        onWorkRequestPropertyChanged,
        onTemplateButtonClicked,
        onSubmit,
        onCancel
    } : {
        workRequest: WorkRequestFormState,
        users: Map<string, User>,
        validationResult: WorkRequestValidationResult,
        onWorkRequestPropertyChanged: <K extends keyof WorkRequestFormState>(key: K, value: WorkRequestFormState[K]) => void;
        onTemplateButtonClicked: (type: string, exp: number) => void,
        onSubmit: (e: any) => void,
        onCancel: (e: any) => void
    }
) {
    return (
        <form onSubmit={onSubmit}>
            <div className="entryDetails">
                <p className="label">Data utworzenia zlecenia</p>
                <div>
                    <input
                        id="workRequestDate"
                        data-testid="work-request-date-input"
                        aria-label="Date"
                        type="date"
                        value={workRequest.createdDate}
                        className="entityDatePicker"
                        onChange={ e => onWorkRequestPropertyChanged("createdDate", e.target.value)}
                    />
                </div>

                <p className="label">Zleceniodawca</p>
                {validationResult.createdBy ? (<p className="validationMessage">{validationResult.createdBy}</p>) : (<></>)}
                <p><select
                    id="workRequestCreatedBy"
                    data-testid="work-request-created-by-input"
                    className="entityText"
                    value={workRequest.createdBy}
                    onChange={e => onWorkRequestPropertyChanged("createdBy", e.target.value)}
                    >
                        {Array.from(users.values()).map((user: User) => {
                            return <option key={user.id} value={user.id}>{user.nickname}</option>
                        }
                    )}
                </select></p>

                <p className="label">Status</p>
                <p>Zlecenie wykonane: <input
                    id="workRequestCompleted"
                    data-testid="work-request-completed-input"
                    type="checkbox"
                    checked={workRequest.completed}
                    onChange={(e) => onWorkRequestPropertyChanged("completed", e.target.checked)}
                /></p>

                <p className="label">Szablony</p>
                <TemplateButtons fillTemplate={onTemplateButtonClicked} />

                <p className="label">Czynność</p>
                {validationResult.type ? <p className="validationMessage">{validationResult.type}</p> : null}
                <p><input
                    data-testid="work-request-type-input"
                    type="text"
                    id="workRequestType"
                    className="entityTextArea"
                    onChange={(e) => onWorkRequestPropertyChanged("type", e.target.value)}
                    value={workRequest.type}
                /></p>

                <p className="label">Punkty doświadczenia do zdobycia</p>
                {validationResult.exp ? <p className="validationMessage">{validationResult.exp}</p> : null}
                <p><input
                    data-testid="work-request-exp-input"
                    type="text"
                    id="workRequestExp"
                    className="newWorkrequestTextArea"
                    onChange={(e) => onWorkRequestPropertyChanged("exp", e.target.value)}
                    value={workRequest.exp}
                /></p>

                <p className="label">Pilność</p>
                {validationResult.urgency ? <p className="validationMessage">{validationResult.urgency}</p> : null}
                <p><select
                    data-testid="work-request-urgency-input"
                    onChange={(e) => onWorkRequestPropertyChanged("urgency", e.target.value)}
                    value={workRequest.urgency}
                >
                    {urgencyList.map((urgency: Urgency) => (
                        <option key={urgency.level} value={urgency.level}>{urgency.label}</option>
                    ))}
                </select></p>

                <p className="label">Instrukcje</p>
                <p><textarea
                    data-testid="work-request-instructions-input"
                    id="workRequestInstructions"
                    className="entityTextArea"
                    rows={5}
                    onChange={(e) => onWorkRequestPropertyChanged("instructions", e.target.value)}
                    value={workRequest.instructions}
                /></p>
            </div>
            <div>
                <button type="submit" data-testid="submit-button">Zatwierdź</button>
                <button type="button" data-testid="cancel-button" onClick={onCancel}>Anuluj</button>
            </div>
        </form>
    )
}