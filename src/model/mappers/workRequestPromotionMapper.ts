import type { Schema } from "../../../amplify/data/resource";
import type { ActivityFormState } from "../../model/ActivityFormState";
import { AuthUser } from "aws-amplify/auth";
import { getCurrentDate } from "../../utils/dateUtils";

function mapWorkRequestModelToActivityFormState(model: Schema["WorkRequest"]["type"] | null, currentUser: AuthUser): ActivityFormState | null {
  if (model === null) {
      return null;
  }

  return {
    date: getCurrentDate(),
    user: currentUser.userId,
    type: model.type,
    exp: model.exp.toString(),
    comment: "",
    scope: "ALL",
    requestedAs: model.id
  };
}

export {
    mapWorkRequestModelToActivityFormState as workRequestModelToActivityFormState
}