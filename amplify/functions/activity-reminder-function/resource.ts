import { defineFunction } from "@aws-amplify/backend";

const envName = process.env.CHOCOOP_ENV;

if (!envName) {
    throw new Error("CHOCOOP_ENV is not set");
}

export const activityReminderFunction = defineFunction({
    name: "sebcel-chocoop-activity-reminder-function-" + envName,
    timeoutSeconds: 60,
    environment: {
        BRANCH_NAME: envName
    }
});
