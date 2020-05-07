import { ScheduledHandler } from 'aws-lambda'; // eslint-disable-line import/no-unresolved
import Axios from 'axios';
import Cheerio from 'cheerio';
import * as moment from 'moment-timezone';
import AWSXRay from 'aws-xray-sdk';
import AWSSDK from 'aws-sdk';
import HTTPS from 'https';
import Settings from './settings';

const AWS = AWSXRay.captureAWS(AWSSDK);
AWSXRay.captureHTTPsGlobal(HTTPS, true);
AWSXRay.capturePromise();

moment.tz.setDefault('Asia/Tokyo');

const Moji = require('@eai/moji');  // eslint-disable-line

// 最後のa=10が札幌を示している
const Url =
  'https://tv.yahoo.co.jp/search/?q=%E3%82%A4%E3%83%83%E3%83%86Q&a=10';
const Title = '世界の果てまでイッテQ!';

// eslint-disable-next-line import/prefer-default-export
export const handler: ScheduledHandler = async event => {
  const response = await Axios.get(Url);
  const $ = Cheerio.load(response.data);
  const programInfos = $('.programlist li')
    .map((index, elm) => {
      const left = $('div.leftarea', elm);
      const right = $('div.rightarea', elm);
      const dateString = $('p:first-of-type > em', left).text();
      const timeString = $('p:nth-of-type(2) > em', left).text();
      const titleString = $('p:first-of-type > a', right).text();
      return {
        date: dateString,
        time: timeString,
        // 番組表の文字列、全角半角の混ざり方が不規則なので、英数は半角、カナは全角に揃える
        title: Moji(titleString)
          .convert('ZEtoHE')
          .convert('HKtoZK')
          .toString()
      };
    })
    .get()
    .filter(x => x.title.indexOf(Title) === 0);
  // 特番とかだと違う番組が引っかかることがあるので、番組名先頭に「世界の果てまでイッテQ!」
  // と書かれているものを対象番組として扱うことにする

  // 今日あるかどうかの判断を行う
  const timestamp = moment.default(event.time);
  const dateString = timestamp.format('M/D');
  const filtered = programInfos.filter(x => x.date === dateString);

  const speechText = ((): string => {
    if (filtered.length > 0) {
      // 今日ある場合は、番組詳細まで返す
      const subStr = filtered
        .map(x => {
          const timeString = x.time.replace('～', 'から');
          const result = `${timeString}に${x.title}が`;
          return result;
        })
        .join('、');
      return `今日は${subStr}あります。`;
    }
    if (programInfos.length > 0) {
      // 今日はないけど、明日以降見つかったら、日付と時刻を返す。
      const subStr = programInfos
        .map(x => {
          const result = `${x.date.replace('/', '月')}日${x.time.replace(
            '～',
            'から'
          )}`;
          return result;
        })
        .join('と、');
      return `今日はイッテQはありませんが、${subStr}にあるようです。`;
    }
    // ない
    return '今日はイッテQはありません。';
  })();

  const speechTextZen = Moji(speechText)
    .convert('HEtoZE')
    .toString();

  const s3 = new AWS.S3({ region: Settings.getRegion() });
  await s3
    .putObject({
      Bucket: Settings.getBucket(),
      Key: Settings.getKey(),
      Body: speechTextZen
    })
    .promise();
};
