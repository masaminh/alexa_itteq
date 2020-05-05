import { HandlerInput, RequestHandler, SkillBuilders } from 'ask-sdk-core';
import { Response } from 'ask-sdk-model';
import * as moment from 'moment-timezone';

import Axios from 'axios';
import Cheerio from 'cheerio';

const Moji = require('@eai/moji');  // eslint-disable-line

moment.tz.setDefault('Asia/Tokyo');

// 最後のa=10が札幌を示している
const Url =
  'https://tv.yahoo.co.jp/search/?q=%E3%82%A4%E3%83%83%E3%83%86Q&a=10';
const Title = '世界の果てまでイッテQ!';

// スキル起動ハンドラ
const LaunchRequestHandler: RequestHandler = {
  canHandle(handlerInput: HandlerInput): boolean {
    // スキル起動時に反応する
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  async handle(handlerInput: HandlerInput): Promise<Response> {
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
    const timestamp = moment.default(
      handlerInput.requestEnvelope.request.timestamp
    );
    const dateString = timestamp.format('M/D');
    const filtered = programInfos.filter(x => x.date === dateString);

    let speechText;

    if (filtered.length > 0) {
      // 今日ある場合は、番組詳細まで返す
      const subStr = filtered
        .map(x => {
          const timeString = x.time.replace('～', 'から');
          const result = `${timeString}に${x.title}が`;
          return result;
        })
        .join('、');
      speechText = `今日は${subStr}あります。`;
    } else if (programInfos.length > 0) {
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
      speechText = `今日はイッテQはありませんが、${subStr}にあるようです。`;
    } else {
      // ない
      speechText = '今日はイッテQはありません。';
    }

    return (
      handlerInput.responseBuilder
        // 最後は全角で返さないとうまく読んでもらえない。
        .speak(
          Moji(speechText)
            .convert('HEtoZE')
            .toString()
        )
        .getResponse()
    );
  }
};
exports.handler = SkillBuilders.custom()
  .addRequestHandlers(LaunchRequestHandler)
  .lambda();
