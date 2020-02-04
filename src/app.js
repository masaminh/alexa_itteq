const Alexa = require('ask-sdk-core')
const Axios = require('axios')
const Cheerio = require('cheerio')
const Moment = require('moment-timezone')
const Moji = require('@eai/moji')

Moment.tz.setDefault('Asia/Tokyo')

const Url = 'https://tv.yahoo.co.jp/search/?q=%E3%82%A4%E3%83%83%E3%83%86Q&a=10'
const Title = '世界の果てまでイッテQ!'

const LaunchRequestHandler = {
  canHandle (handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest'
  },
  async handle (handlerInput) {
    const response = await Axios.get(Url)
    const $ = Cheerio.load(response.data)
    const programInfos = $('.programlist li').map((index, elm) => {
      const left = $(elm).find('div.leftarea')
      const right = $(elm).find('div.rightarea')
      const dateString = $(left).find('p:first-of-type > em').text()
      const timeString = $(left).find('p:nth-of-type(2) > em').text()
      const titleString = $(right).find('p:first-of-type > a').text()
      return {
        date: dateString,
        time: timeString,
        title: Moji(titleString).convert('ZEtoHE').convert('HKtoZK').toString()
      }
    }).get().filter(x => x.title.indexOf(Title) === 0)

    const timestamp = Moment(handlerInput.requestEnvelope.request.timestamp)
    const dateString = timestamp.format('M/D')
    const filtered = programInfos.filter(x => x.date === dateString)

    let speechText

    if (filtered.length > 0) {
      const subStr = filtered.map(x => {
        const timeString = x.time.replace('～', 'から')
        const result = timeString + 'に' + x.title + 'が'
        return result
      }).join('、')
      speechText = '今日は' + subStr + 'あります。'
    } else if (programInfos.length > 0) {
      const subStr = programInfos.map(x => {
        const result = x.date.replace('/', '月') + '日' + x.time.replace('～', 'から')
        return result
      }).join('と、')
      speechText = '今日はイッテQはありませんが、' + subStr + 'にあるようです。'
    } else {
      speechText = '今日はイッテQはありません。'
    }

    return handlerInput.responseBuilder
      .speak(Moji(speechText).convert('HEtoZE').toString())
      .getResponse()
  }
}
exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler
  )
  .lambda()
