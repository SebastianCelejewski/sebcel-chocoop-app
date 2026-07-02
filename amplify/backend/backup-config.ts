import { Duration } from "aws-cdk-lib/core";
import { BackupPlan, BackupPlanRule, BackupResource, BackupVault } from "aws-cdk-lib/aws-backup";
import { Schedule } from "aws-cdk-lib/aws-events";

export function configureBackup(backend: any, envName: string) {
    const backupStack = backend.createStack("sebcel-chocoop-backup-stack-" + envName);
    const tables = Object.values(backend.data.resources.tables);

    const vault = new BackupVault(backupStack, "sebcel-chocoop-backup-vault-" + envName, {
        backupVaultName: "sebcel-chocoop-backup-vault-" + envName,
    });

    const plan = new BackupPlan(backupStack, "sebcel-chocoop-backup-plan-" + envName, {
        backupPlanName: "sebcel-chocoop-backup-plan-" + envName,
        backupVault: vault,
    });

    plan.addRule(
        new BackupPlanRule({
            deleteAfter: Duration.days(60),
            ruleName: "sebcel-chocoop-backup-plan-rule-" + envName,
            scheduleExpression: Schedule.cron({
                minute: "0",
                hour: "0",
                day: "*",
                month: "*",
                year: "*",
            }),
        })
    );

    plan.addSelection("sebcel-chocoop-backup-plan-selection-" + envName, {
        resources: (tables as any[]).map((table) => BackupResource.fromDynamoDbTable(table)),
        allowRestores: true,
    });
}
