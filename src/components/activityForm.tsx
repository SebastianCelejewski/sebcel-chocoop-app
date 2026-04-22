import User from "../model/User";
import { ActivityFormState } from "../model/ActivityFormState";
import TemplateButtons from "./templateButtons";
import { ActivityValidationResult } from "../model/ValidationResult";

const currentDateTimeUTC = new Date()
const timeZoneOffset = currentDateTimeUTC.getTimezoneOffset()
const currentDateTimeLocal = new Date(currentDateTimeUTC.getTime() - timeZoneOffset * 60 * 1000)
const currentDate = currentDateTimeLocal.toISOString().split("T")[0]
const yesterdayDateTimeLocal = new Date(currentDateTimeLocal.getTime() - 24 * 60 * 60 * 1000);
const yesterdayDate = yesterdayDateTimeLocal.toISOString().split("T")[0]

export function ActivityForm(
    {
        activity,
        users,
        validationResult,
        onActivityPropertyChanged,
        onTemplateButtonClicked,
        onSubmit,
        onCancel
    } : {
        activity: ActivityFormState,
        users: Map<string, User>,
        validationResult: ActivityValidationResult,
        onActivityPropertyChanged: <K extends keyof ActivityFormState>(key: K, value: ActivityFormState[K]) => void;
        onTemplateButtonClicked: (type: string, exp: number) => void,
        onSubmit: (e: any) => void,
        onCancel: (e: any) => void
    }
) {
    return (
        <form onSubmit={onSubmit}>
            <div className="entryDetails">
                <p className="label">Data wykonania czynności</p>
                <div>
                    <button type="button" data-testid="yesterday-button" className="entityButton" onClick={() => onActivityPropertyChanged("date", yesterdayDate)}>Wczoraj</button>
                    <button type="button" data-testid="today-button" className="entityButton" onClick={() => onActivityPropertyChanged("date", currentDate)}>Dziś</button>

                    <input
                        id="activityDate"
                        data-testid="activity-date-input"
                        aria-label="Date"
                        type="date"
                        value={activity.date}
                        className="entityDatePicker"
                        onChange={ e => onActivityPropertyChanged("date", e.target.value)}
                    />
                </div>

                <p className="label">Wykonawca</p>
                {validationResult.user ? (<p className="validationMessage">{validationResult.user}</p>) : (<></>)}
                <p><select
                    id="activityPerson"
                    data-testid="activity-person-input"
                    className="entityText"
                    value={activity.user}
                    onChange={e => onActivityPropertyChanged("user", e.target.value)}
                    >
                        {Array.from(users.values()).map((user: User) => {
                            return <option key={user.id} value={user.id}>{user.nickname}</option>
                        }
                    )}
                </select></p>

                <p className="label">Szablony</p>
                <TemplateButtons fillTemplate={onTemplateButtonClicked} />

                <p className="label">Czynność</p>
                {validationResult.type ? (<p className="validationMessage">{validationResult.type}</p>) : (<></>)}
                <p><input
                        id="activityType"
                        data-testid="activity-type-input"
                        type="text"
                        className="entityTextArea"
                        value={activity.type}
                        onChange={ e => onActivityPropertyChanged("type", e.target.value)}
                /></p>

                <p className="label">Zdobyte punkty doświadczenia</p>
                {validationResult.exp ? (<p className="validationMessage">{validationResult.exp}</p>) : (<></>)}
                <p><input
                    id="activityExp"
                    data-testid="activity-exp-input"
                    type="text"
                    className="entityText"
                    value={activity.exp}
                    onChange={ e => onActivityPropertyChanged("exp", e.target.value)}
                /></p>

                <p className="label">Komentarz</p>
                {validationResult.comment ? (<p className="validationMessage">{validationResult.comment}</p>) : (<></>)}
                <p><textarea
                    id="activityComment"
                    data-testid="activity-comment-input"
                    className="entityTextArea"
                    rows={5}
                    value={activity.comment}
                    onChange={ e => onActivityPropertyChanged("comment", e.target.value)}
                /></p>
            </div>
            <div>
                <button type="submit" data-testid="submit-button">Zatwierdź</button>
                <button type="button" data-testid="cancel-button" onClick={onCancel}>Anuluj</button>
            </div>
        </form>
    )
}