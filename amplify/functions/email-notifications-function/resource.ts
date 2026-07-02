import { defineFunction } from "@aws-amplify/backend";

const envName = process.env.CHOCOOP_ENV;

if (!envName) {
    throw new Error("CHOCOOP_ENV is not set");
}

export const emailNotificationsFunction = defineFunction({
    name: "sebcel-chocoop-email-notifications-function-" + envName,
    timeoutSeconds: 30,
    environment: {
        BRANCH_NAME: envName
    }
});
