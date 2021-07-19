import * as cdk from "@aws-cdk/core";
import * as s3 from "@aws-cdk/aws-s3";
import * as iam from "@aws-cdk/aws-iam";

export class PTStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
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
            actions: ["s3:ListAllMyBuckets", "s3:PutObject", "s3:PutObjectAcl", "s3:GetObject", "s3:GetObjectVersion"],
            resources: ["arn:aws:s3:::*"],
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
