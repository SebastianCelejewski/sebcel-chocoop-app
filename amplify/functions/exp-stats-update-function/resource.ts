import { defineFunction } from "@aws-amplify/backend";

const envName = process.env.CHOCOOP_ENV;

if (!envName) {
    throw new Error("CHOCOOP_ENV is not set");
}

export const expStatsUpdateFunction = defineFunction({
    name: "chocoop-exp-stats-update-function-" + envName,
    timeoutSeconds: 10,
    environment: {
        BRANCH_NAME: envName
    }
});