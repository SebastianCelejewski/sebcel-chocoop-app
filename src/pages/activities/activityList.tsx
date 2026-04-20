import { dateToString } from "../../utils/dateUtils";
import { List, AutoSizer, CellMeasurer, CellMeasurerCache } from 'react-virtualized';

import User from "../../model/User";
import { ReactionsFromAllUsers } from "../../components/reactions";
import { useActivityListActions } from "./hooks/useActivityListActions";
import { useActivityListDetails } from "./hooks/useActivityListDetails";    

const cache = new CellMeasurerCache({
    fixedWidth: true,
    defaultHeight: 100
});

function ActivityList({users}: {users: Map<string, User>}) {

    const {activities, reactions} = useActivityListDetails();
    const {createActivity, showActivity, navigateToWorkRequests} = useActivityListActions();

    cache.clearAll()

    if (activities.length == 0) {
        return <>
            <p className="pageTitle" data-testid="activity-list-page" onClick={navigateToWorkRequests}>Lista wykonanych czynności</p>
            <div className="loadingData">Ładowanie danych</div>
            <div className="buttonPanel">
                <button onClick={createActivity} data-testid="create-button">Dodaj czynność</button>
            </div>
        </>
    }

    function renderRow({ index, key, style, parent }: { index: number, key: string, style: React.CSSProperties, parent: any}) {
        const activity = activities[index];
        return (
            <CellMeasurer
                key={key}
                cache={cache}
                parent={parent}
                columnIndex={0}
                rowIndex={index}>
                {({registerChild}) => (
                    <div style={style} className="row" ref={registerChild}>
                        <li data-testid="activity-card"
                            data-objectid={activity.id}
                            className="entityListElement"
                            onClick={() => showActivity(activity.id)}
                            key={activity.id}>
                            {activity.comment && <p className="entityCommentIcon" data-testid="comment-property">📝</p>}
                            <p className="entityDate" data-testid="date-property">{dateToString(activity.date)}</p>
                            <p className="entityPerson" data-testid="person-property">{users.get(activity.user)?.nickname}</p>
                            <p className="entityType" data-testid="type-property">{activity.type}</p>
                            <p className="entityExp" data-testid="exp-property">{activity.exp} xp</p>
                            <div style={{clear: 'both'}}/>
                            <ReactionsFromAllUsers activityId={activity.id} reactions={reactions}/>
                        </li>
                    </div>
                )}
            </CellMeasurer>
        );
    }

    return <>
        <h2 className="pageTitle" data-testid="activity-list-page" onClick={navigateToWorkRequests}>Lista wykonanych czynności</h2>

        <ul className="entityList">
            <AutoSizer>
            {
                ({ width, height }) => (
                    <List
                        width={width}
                        height={height}
                        deferredMeasurementCache={cache}
                        rowHeight={cache.rowHeight}
                        rowRenderer={renderRow}
                        rowCount={activities.length}
                        overscanRowCount={3}
                    />
                )
            }
            </AutoSizer>
        </ul>
        <div className="buttonPanel">
            <button data-testid="create-button" onClick={createActivity}>Dodaj czynność</button>
        </div>
    </>;
}

export default ActivityList;