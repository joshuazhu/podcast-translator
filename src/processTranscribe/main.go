package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
)

// Response is of type APIGatewayProxyResponse since we're leveraging the
// AWS Lambda Proxy Request functionality (default behavior)
//
// https://serverless.com/framework/docs/providers/aws/events/apigateway/#lambda-proxy-integration
type Response events.APIGatewayProxyResponse

type TranscribeRawData struct {
	JobName   string `json:"jobName"`
	AccountID string `json:"accountId"`
	Results   struct {
		Transcripts []struct {
			Transcript string `json:"transcript"`
		} `json:"transcripts"`
		Items []struct {
			StartTime    string `json:"start_time,omitempty"`
			EndTime      string `json:"end_time,omitempty"`
			Alternatives []struct {
				Confidence string `json:"confidence"`
				Content    string `json:"content"`
			} `json:"alternatives"`
			Type string `json:"type"`
		} `json:"items"`
	} `json:"results"`
	Status string `json:"status"`
}

type TranscribeData struct {
	StartTime string
	EndTime   string
	Content   string
}

const podcastProccessedTranscriptionBucket = "podcast-proccessed-transcription-bucket"

// Handler is our lambda handler invoked by the `lambda.Start` function call
func Handler(ctx context.Context, S3Event events.S3Event) {
	sess, _ := session.NewSession(&aws.Config{
		Region: aws.String("us-east-1"),
	})

	svc := s3.New(sess, &aws.Config{
		DisableRestProtocolURICleaning: aws.Bool(true),
	})

	requestInput := &s3.GetObjectInput{
		Bucket: aws.String(S3Event.Records[0].S3.Bucket.Name),
		Key:    aws.String(S3Event.Records[0].S3.Object.Key),
	}

	result, err := svc.GetObject(requestInput)

	if err != nil {
		fmt.Println(err)
	}
	defer result.Body.Close()

	bodyData, err := ioutil.ReadAll(result.Body)
	if err != nil {
		fmt.Println(err)
	}

	transcribeRawData := TranscribeRawData{}
	json.Unmarshal(bodyData, &transcribeRawData)

	if err != nil {
		fmt.Println("twas an error")
	}

	processedData := MergeWordsToSentence(&transcribeRawData)

	fmt.Println("processedData", processedData)
	processedDataInByte, _ := json.Marshal(processedData)

	input := &s3.PutObjectInput{
		Body:   aws.ReadSeekCloser(bytes.NewReader(processedDataInByte)),
		Bucket: aws.String(podcastProccessedTranscriptionBucket),
		Key:    aws.String(S3Event.Records[0].S3.Object.Key + "_processed"),
	}

	svc.PutObject(input)
}

func MergeWordsToSentence(rawData *TranscribeRawData) []TranscribeData {
	transcriptions := []TranscribeData{}
	tmpStartTime := ""
	tmpEndTime := ""
	tmpSentence := ""

	for _, data := range rawData.Results.Items {
		if data.Type == "punctuation" {
			transcriptions = append(transcriptions, TranscribeData{
				StartTime: tmpStartTime,
				EndTime:   tmpEndTime,
				Content:   tmpSentence,
			})

			tmpStartTime = ""
			tmpEndTime = ""
			tmpSentence = ""
			continue
		}

		if tmpStartTime == "" {
			tmpStartTime = data.StartTime
		}

		tmpEndTime = data.EndTime
		tmpSentence = tmpSentence + " " + data.Alternatives[0].Content
	}

	return transcriptions
}

func main() {
	lambda.Start(Handler)
}
