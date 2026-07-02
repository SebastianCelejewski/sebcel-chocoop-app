import { defineFunction } from "@aws-amplify/backend";

const envName = process.env.CHOCOOP_ENV;

if (!envName) {
    throw new Error("CHOCOOP_ENV is not set");
}

export const domainEventsFunction = defineFunction({
    name: "sebcel-chocoop-domain-events-function-" + envName,
    timeoutSeconds: 30,
    environment: {
        BRANCH_NAME: envName
    }
});
