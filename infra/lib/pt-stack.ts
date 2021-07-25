import * as cdk from "@aws-cdk/core";
import * as s3 from "@aws-cdk/aws-s3";
import * as iam from "@aws-cdk/aws-iam";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as rds from "@aws-cdk/aws-rds";
import * as secretsManager from "@aws-cdk/aws-secretsmanager";
const ssm = require("@aws-cdk/aws-ssm");

export class PTStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, serviceName: string, props?: cdk.StackProps) {
        super(scope, id, props);
        this.provisionS3();
        this.provisionDatabase(serviceName);
    }

    provisionDatabase(serviceName: string) {
        const databaseUsername = "podcast_database";

        const databaseCredentialsSecret = new secretsManager.Secret(this, "DBCredentialsSecret", {
            secretName: `${serviceName}-db-credentials`,
            generateSecretString: {
                secretStringTemplate: JSON.stringify({
                    username: databaseUsername,
                }),
                excludePunctuation: true,
                includeSpace: false,
                generateStringKey: "password",
            },
        });

        new ssm.StringParameter(this, "DBCredentialsArn", {
            parameterName: `${serviceName}-db-credentials-arn`,
            stringValue: databaseCredentialsSecret.secretArn,
        });

        const vpc = new ec2.Vpc(this, "AuroraVPC");

        const cluster = new rds.ServerlessCluster(this, "${serviceName}-cluster", {
            engine: rds.DatabaseClusterEngine.AURORA_POSTGRESQL,
            parameterGroup: rds.ParameterGroup.fromParameterGroupName(
                this,
                "ParameterGroup",
                "default.aurora-postgresql10"
            ),
            defaultDatabaseName: "Podcast",
            vpc,
            credentials: {
                username: databaseCredentialsSecret.secretValueFromJson("username").toString(),
                password: databaseCredentialsSecret.secretValueFromJson("password"),
            },
            scaling: {
                minCapacity: rds.AuroraCapacityUnit.ACU_8,
                maxCapacity: rds.AuroraCapacityUnit.ACU_32,
            },
        });

        const dbClusterArn = cluster.clusterArn;
        new ssm.StringParameter(this, "DBResourceArn", {
            parameterName: `${serviceName}-db-cluster-arn`,
            stringValue: dbClusterArn,
        });

        new ssm.StringParameter(this, "DBEndpoint", {
            parameterName: `${serviceName}-db-cluster-endpoint`,
            stringValue: `${cluster.clusterEndpoint.hostname}:${cluster.clusterEndpoint.port}`,
        });
    }

    provisionS3() {
        const sourceAudioBucketName = "podcast-source-audio-bucket";
        const sourceTranscriptionBucketName = "podcast-source-transcription-bucket";
        const processedTranscriptionBucketName = "podcast-proccessed-transcription-bucket";

        new s3.Bucket(this, sourceAudioBucketName, {
            bucketName: sourceAudioBucketName,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });

        new s3.Bucket(this, sourceTranscriptionBucketName, {
            bucketName: sourceTranscriptionBucketName,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });

        new s3.Bucket(this, processedTranscriptionBucketName, {
            bucketName: processedTranscriptionBucketName,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });

        const s3ReadWriteBucketsPolicy = new iam.PolicyStatement({
            actions: [
                "s3:ListAllMyBuckets",
                "s3:PutObject",
                "s3:PutObjectAcl",
                "s3:GetObject",
                "s3:GetObjectVersion",
                "transcribe:StartTranscriptionJob",
            ],
            resources: ["arn:aws:s3:::*", "*"],
        });

        const role = iam.Role.fromRoleArn(
            this,
            "lambdaRole",
            `arn:aws:iam::${this.account}:role/podcast-translator-dev-${this.region}-lambdaRole`,
            {
                mutable: true,
            }
        );

        role.addToPrincipalPolicy(s3ReadWriteBucketsPolicy);
    }
}
