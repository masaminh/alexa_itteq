import {
  HandlerInput,
  RequestHandler,
  SkillBuilders,
  ErrorHandler
} from 'ask-sdk-core';
import { Response } from 'ask-sdk-model';
import iconv from 'iconv-lite';
import AWSXRay from 'aws-xray-sdk';
import AWSSDK from 'aws-sdk';
import Settings from './settings';

const AWS = AWSXRay.captureAWS(AWSSDK);
const s3 = new AWS.S3({ region: Settings.getRegion() });

const paramGetObject = { Bucket: Settings.getBucket(), Key: Settings.getKey() };

console.log('初回起動');  // eslint-disable-line

// 1度だけ空読みする。1度目のgetObjectに時間がかかるため
s3.getObject(paramGetObject, (err, data) => {
  if (err) {
    console.error(err);  // eslint-disable-line
  } else {
    console.log(iconv.decode(data.Body as Buffer, 'utf-8'));  // eslint-disable-line
  }
});

// スキル起動ハンドラ
const LaunchRequestHandler: RequestHandler = {
  canHandle(handlerInput: HandlerInput): boolean {
    // スキル起動時に反応する
    return handlerInput.requestEnvelope.request?.type === 'LaunchRequest';
  },
  async handle(handlerInput: HandlerInput): Promise<Response> {
    const s3data = await s3.getObject(paramGetObject).promise();
    const speechText = iconv.decode(s3data.Body as Buffer, 'utf-8');

    return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard('今日イッテQある?', speechText)
      .getResponse();
  }
};

const ExceptionHandler: ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    const speechText = ((): string => {
      if (handlerInput.requestEnvelope.request === undefined) {
        return '定期実行です';
      }

      console.error(error); // eslint-disable-line
      return 'エラーが発生しました';
    })();
    return handlerInput.responseBuilder.speak(speechText).getResponse();
  }
};
exports.handler = SkillBuilders.custom()
  .addRequestHandlers(LaunchRequestHandler)
  .addErrorHandlers(ExceptionHandler)
  .lambda();
