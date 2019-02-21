/*
Copyright (c) 2016-Present Energyparty and Energywallet Developers
Distributed under the AGPL 3.0 with the OpenSSL exception, see the
accompanying file LICENSE or https://github.com/energyparty/energywallet
*/

function normalizeQuantity(quantity, divisible) {
  if(typeof(divisible)==='undefined') divisible = true;
  return divisible && quantity !== 0 ? Decimal.round(new Decimal(quantity).div(UNIT), 6, Decimal.MidpointRounding.ToEven).toFloat() : parseInt(quantity);
}

function denormalizeQuantity(quantity, divisible) {
  if(typeof(divisible)==='undefined') divisible = true;
  return divisible && quantity !== 0 ? Decimal.round(new Decimal(quantity).mul(UNIT), 6, Decimal.MidpointRounding.ToEven).toFloat() : parseInt(quantity);
}

function roundAmount(amount) {
  return Decimal.round(new Decimal(amount), 6, Decimal.MidpointRounding.ToEven).toString();
}

function addFloat(floatA, floatB) {
  var a = new Decimal(floatA);
  var b = new Decimal(floatB);
  return Decimal.round(a.add(b), 6, Decimal.MidpointRounding.ToEven).toFloat();
}

function subFloat(floatA, floatB) {
  return addFloat(floatA, -floatB);
}

function mulFloat(floatA, floatB) {
  var a = new Decimal(floatA);
  var b = new Decimal(floatB);
  return Decimal.round(a.mul(b), 6, Decimal.MidpointRounding.ToEven).toFloat();
}

function divFloat(floatA, floatB) {
  var a = new Decimal(floatA);
  var b = new Decimal(floatB);
  return Decimal.round(a.div(b), 6, Decimal.MidpointRounding.ToEven).toFloat();
}

function hashToB64(content) {
  //used for storing address alias data, for instance
  return CryptoJS.SHA256(content).toString(CryptoJS.enc.Base64);
}

function smartFormat(num, truncateDecimalPlacesAtMin, truncateDecimalPlacesTo) { //arbitrary rules to make quantities formatted a bit more friendly
  if(num === null || isNaN(num)) return '??';
  if(num === 0) return num; //avoid Decimal class issue dealing with 0
  if (typeof(truncateDecimalPlacesAtMin) === 'undefined' || truncateDecimalPlacesAtMin === null) truncateDecimalPlacesAtMin = null;
  if(typeof(truncateDecimalPlacesTo)==='undefined') truncateDecimalPlacesTo = 6;
  if(truncateDecimalPlacesAtMin === null || num > truncateDecimalPlacesAtMin) {
    num = Decimal.round(new Decimal(num), truncateDecimalPlacesTo, Decimal.MidpointRounding.ToEven).toFloat();
  }
  return numberWithCommas(noExponents(num));
}

function assetsToAssetPair(asset1, asset2) {
  var base = null;
  var quote = null;

  for (var i in QUOTE_ASSETS) {
    if (asset1 == QUOTE_ASSETS[i] || asset2 == QUOTE_ASSETS[i]) {
      base = asset1 == QUOTE_ASSETS[i] ? asset2 : asset1;
      quote = asset1 == QUOTE_ASSETS[i] ? asset1 : asset2;
      break;
    }
  }

  if (!base) {
    base = asset1 < asset2 ? asset1 : asset2;
    quote = asset1 < asset2 ? asset2 : asset1;
  }

  return [base, quote];
}

function makeQRCode(addr) {
  $.jqlog.debug('Generate Qrcode: '+addr);

  addr = addr.replace(/^[\s\u3000]+|[\s\u3000]+$/g, '');

  var qr = qrcode(3, 'M');
  qr.addData(addr);
  qr.make();

  return qr.createImgTag(4);
}

// from bitcoinjs-lib
function bytesToBase64(bytes) {
  var base64map = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  var base64 = []

  for (var i = 0; i < bytes.length; i += 3) {
    var triplet = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]

    for (var j = 0; j < 4; j++) {
      if (i * 8 + j * 6 <= bytes.length * 8) {
        base64.push(base64map.charAt((triplet >>> 6 * (3 - j)) & 0x3F))
      } else {
        base64.push('=')
      }
    }
  }

  return base64.join('')
}

function stringToBytes(string) {
  return string.split('').map(function(x) {
    return x.charCodeAt(0)
  })
}

function bytesToWords(bytes) {
  var words = []
  for (var i = 0, b = 0; i < bytes.length; i++, b += 8) {
    words[b >>> 5] |= bytes[i] << (24 - b % 32)
  }
  return words
}

function wordsToBytes(words) {
  var bytes = []
  for (var b = 0; b < words.length * 32; b += 8) {
    bytes.push((words[b >>> 5] >>> (24 - b % 32)) & 0xFF)
  }
  return bytes
}

function bytesToWordArray(bytes) {
  return new CryptoJS.lib.WordArray.init(bytesToWords(bytes), bytes.length)
}

function wordArrayToBytes(wordArray) {
  return wordsToBytes(wordArray.words)
}
