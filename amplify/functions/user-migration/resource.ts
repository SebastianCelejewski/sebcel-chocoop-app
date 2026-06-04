import { defineFunction } from "@aws-amplify/backend";

export const userMigrationFunction = defineFunction({

    name: "user-migration",

    entry: "./handler.ts",

    environment: {
        OLD_USER_POOL_ID: "eu-central-1_7BujYEqE1",
        OLD_CLIENT_ID: "3libgfmgl8q7fg82ehu71j5p1f"
    }
});