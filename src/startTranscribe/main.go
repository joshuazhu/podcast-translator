package main

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/transcribeservice"
)

// Response is of type APIGatewayProxyResponse since we're leveraging the
// AWS Lambda Proxy Request functionality (default behavior)
//
// https://serverless.com/framework/docs/providers/aws/events/apigateway/#lambda-proxy-integration
type Response events.APIGatewayProxyResponse

const podcastSourceTranscriptionBucket = "podcast-source-transcription-bucket"

// Handler is our lambda handler invoked by the `lambda.Start` function call
func Handler(ctx context.Context, S3Event events.S3Event) {
	s3Record := S3Event.Records[0].S3

	sess := session.Must(session.NewSession())
	svc := transcribeservice.New(sess, aws.NewConfig().WithRegion("us-east-1"))

	jobInput := transcribeservice.StartTranscriptionJobInput{
		LanguageCode: aws.String("en-US"),
		Media: &transcribeservice.Media{
			MediaFileUri: aws.String("s3://" + s3Record.Bucket.Name + "/" + s3Record.Object.Key),
		},
		Settings: &transcribeservice.Settings{
			MaxAlternatives:   aws.Int64(2),
			MaxSpeakerLabels:  aws.Int64(2),
			ShowAlternatives:  aws.Bool(true),
			ShowSpeakerLabels: aws.Bool(true),
		},
		TranscriptionJobName: aws.String(s3Record.Object.Key + "_" + strconv.FormatInt(time.Now().Unix(), 10)),
		OutputBucketName:     aws.String(podcastSourceTranscriptionBucket),
	}

	_, err := svc.StartTranscriptionJob(&jobInput)

	if err != nil {
		fmt.Println("err", err.Error())
	}
}

func main() {
	lambda.Start(Handler)
}
