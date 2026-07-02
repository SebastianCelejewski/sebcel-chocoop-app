import type { Schema } from "../../../amplify/data/resource";
import type { ActivityFormState } from "../../model/ActivityFormState";
import { toLocalDate } from "../../utils/dateUtils";
import reportError from "../../utils/reportError"

function mapActivityModelToActivityFormState(model: Schema["Activity"]["type"] | null): ActivityFormState | null {
  if (model === null) {
      return null;
  }

  return {
      id: model.id,
      date: toLocalDate(model.date),
      user: model.user,
      type: model.type,
      exp: model.exp.toString(),
      comment: model.comment ?? "",
      requestedAs: model.requestedAs ?? undefined,
      source: model.source ?? undefined,
      scope: model.scope
  }
}

function mapActivityFormStateToActivityModel(activity: ActivityFormState) {
    if (activity.date === undefined) {
        throw new Error(reportError("State activityDate is undefined during creation of a new activity object"))
    }
    if (activity.user === undefined) {
        throw new Error(reportError("State activityPerson is undefined during creation of a new activity object"))
    }
    if (activity.type === undefined) {
        throw new Error(reportError("State activityType is undefined during creation of a new activity object"))
    }
    if (activity.exp === undefined || isNaN(Number(activity.exp))) {
        throw new Error(reportError("State activityExp is undefined during creation of a new activity object"))
    }
    return {
        id: activity.id,
        date: activity.date,
        user: activity.user,
        type: activity.type,
        exp: Number(activity.exp),
        comment: activity.comment,
        requestedAs: activity.requestedAs,
        source: activity.source,
        scope: activity.scope
    }
}

export {
    mapActivityModelToActivityFormState as activityModelToActivityFormState,
    mapActivityFormStateToActivityModel as createActivityObjectFromState
}