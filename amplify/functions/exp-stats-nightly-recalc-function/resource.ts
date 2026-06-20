import { defineFunction } from "@aws-amplify/backend";

const envName = process.env.CHOCOOP_ENV;

if (!envName) {
    throw new Error("CHOCOOP_ENV is not set");
}

export const expStatsNightlyRecalcFunction = defineFunction({
    name: "sebcel-chocoop-exp-stats-nightly-recalc-" + envName,
    timeoutSeconds: 300,
    environment: {
        BRANCH_NAME: envName
    }
});
