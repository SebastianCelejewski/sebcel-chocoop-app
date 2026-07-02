import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { expStatsUpdateFunction } from "./functions/exp-stats-update-function/resource";
import { expStatsNightlyRecalcFunction } from "./functions/exp-stats-nightly-recalc-function/resource";
import { domainEventsFunction } from "./functions/domain-events-function/resource";
import { emailNotificationsFunction } from "./functions/email-notifications-function/resource";
import { activityReminderFunction } from "./functions/activity-reminder-function/resource";
import { userMigrationFunction } from "./functions/user-migration/resource";

import { configureAuth } from "./backend/auth-config";
import { configureDatabaseResources } from "./backend/database-config";
import { configureExpStats } from "./backend/exp-stats-config";
import { configureDomainEvents } from "./backend/domain-events-config";
import { configureNotifications } from "./backend/notifications-config";
import { configureBackup } from "./backend/backup-config";

const envName = process.env.CHOCOOP_ENV;

if (!envName) {
    throw new Error("CHOCOOP_ENV is not set");
}

const backend = defineBackend({
    auth,
    data,
    expStatsUpdateFunction,
    expStatsNightlyRecalcFunction,
    domainEventsFunction,
    emailNotificationsFunction,
    activityReminderFunction,
    userMigrationFunction
});

const ctx = configureDatabaseResources(backend, envName);

configureAuth(backend, envName);
configureExpStats(ctx);
configureDomainEvents(ctx);
configureNotifications(ctx);
configureBackup(backend, envName);
