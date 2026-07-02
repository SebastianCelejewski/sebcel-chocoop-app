import * as cdk from "aws-cdk-lib";

export type BackendContext = {
    backend: any;
    envName: string;
    activityTableParam: cdk.aws_ssm.StringParameter;
    expStatsTableParam: cdk.aws_ssm.StringParameter;
};
