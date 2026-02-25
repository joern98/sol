// import translatorLanguage from './translatorLanguage'

interface TranslationResult {
  text: string;
  alternatives: string[];
  pronunciation: string;
  from: {
    language: {
      didYouMean: boolean;
      iso: string;
    };
    text: {
      autoCorrected: boolean;
      value: string;
      didYouMean: boolean;
    };
  };
  raw: string;
}

async function translate(
  text: string,
  opts?: {from?: string | boolean; to?: string | boolean; tld?: string},
): Promise<TranslationResult | undefined> {
  try {
    var result: TranslationResult = {
      text: '',
      alternatives: [],
      pronunciation: '',
      from: {
        language: {
          didYouMean: false,
          iso: '',
        },
        text: {
          autoCorrected: false,
          value: '',
          didYouMean: false,
        },
      },
      raw: '',
    }

    opts = opts || {}
    // var e = undefined as {message: string; code: number} | undefined
    // var languages = new translatorLanguage()
    // ;[opts.from, opts.to].forEach(function (lang) {
    //   if (lang && !languages.isSupported(lang)) {
    //     e = {
    //       message: "The language '" + lang + "' is not supported",
    //       code: 400,
    //     }
    //   }
    // })
    // if (e) {
    //   return undefined
    // }
    const extract = (key: string, res: string) => {
      var re = new RegExp(`"${key}":".*?"`)
      var result = re.exec(res)
      if (result !== null) {
        return result[0].replace(`"${key}":"`, '').slice(0, -1)
      }
      return ''
    }

    const objToQueryString = (obj: any) => {
      const keyValuePairs = []
      for (const key in obj) {
        keyValuePairs.push(key + '=' + obj[key])
      }
      return keyValuePairs.join('&')
    }

    opts.from = opts.from || 'auto'
    opts.to = opts.to || 'en'
    opts.tld = opts.tld || 'com'

    // opts.from = languages.getCode(opts.from.toString())
    // opts.to = languages.getCode(opts.to.toString())

    var url = 'https://translate.google.' + opts.tld
    var response = await fetch(url)
    var txt = await response.text()

    var data = {
      rpcids: 'MkEWBc',
      'f.sid': extract('FdrFJe', txt),
      bl: extract('cfb2h', txt),
      hl: 'en-US',
      'soc-app': 1,
      'soc-platform': 1,
      'soc-device': 1,
      _reqid: Math.floor(1000 + Math.random() * 9000),
      rt: 'c',
    }

    url =
      url +
      '/_/TranslateWebserverUi/data/batchexecute?' +
      objToQueryString(data)
    var body =
      'f.req=' +
      encodeURIComponent(
        JSON.stringify([
          [
            [
              'MkEWBc',
              JSON.stringify([[text, opts.from, opts.to, true], [null]]),
              null,
              'generic',
            ],
          ],
        ]),
      ) +
      '&'
    var res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: body,
    })
    if (res) {
      var ttx = await res.text()
      var json = ttx.slice(6)
      var length = ''

      try {
        length = /^\d+/.exec(json)![0]

        json = JSON.parse(
          json.slice(length.length, parseInt(length, 10) + length.length),
        )

        json = JSON.parse(json[0][2])

        result.raw = json
      } catch (e) {
        return result
      }
      if (json[1][0][0][5] === undefined) {
        // translation not found, could be a hyperlink?
        result.text = json[1][0][0][0]
      } else {
        // Extract all alternatives from the response
        const alternatives: string[] = [];
        ;(json[1][0][0][5] as any).forEach(function (obj: any) {
          if (obj[0]) {
            alternatives.push(obj[0])
          }
        })
        
        // Set the first alternative as the main text
        if (alternatives.length > 0) {
          result.text = alternatives[0]
          result.alternatives = alternatives
        }
      }
      result.pronunciation = json[1][0][0][1]

      // From language
      if (json[0] && json[0][1] && json[0][1][1]) {
        result.from.language.didYouMean = true
        result.from.language.iso = json[0][1][1][0]
      } else if (json[1][3] === 'auto') {
        result.from.language.iso = json[2]
      } else {
        result.from.language.iso = json[1][3]
      }

      // Did you mean & autocorrect
      if (json[0] && json[0][1] && json[0][1][0]) {
        var str = json[0][1][0][0][1]

        str = str.replace(/<b>(<i>)?/g, '[')
        str = str.replace(/(<\/i>)?<\/b>/g, ']')

        result.from.text.value = str

        // @ts-ignore
        if (json[0][1][0][2] === 1) {
          result.from.text.autoCorrected = true
        } else {
          result.from.text.didYouMean = true
        }
      }

      return result
    }
  } catch (error) {
    // console.log(error)
  }

  return undefined
}

export interface GoogleTranslateResult {
  text: string;
  alternatives: string[];
}

export async function googleTranslate(
  lang1: string,
  lang2: string,
  lang3: string | null,
  str: string,
): Promise<[GoogleTranslateResult, GoogleTranslateResult, GoogleTranslateResult]> {
  const promises = [translate(str, {to: lang1}), translate(str, {to: lang2})]

  if (lang3) {
    promises.push(translate(str, {to: lang3}))
  }

  const results = await Promise.all(promises)

  return [
    {
      text: results[0]?.text ?? '',
      alternatives: results[0]?.alternatives ?? [],
    },
    {
      text: results[1]?.text ?? '',
      alternatives: results[1]?.alternatives ?? [],
    },
    {
      text: results[2]?.text ?? '',
      alternatives: results[2]?.alternatives ?? [],
    },
  ]
}