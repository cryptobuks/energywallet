/***********
Copyright (c) 2016-Present Energyparty and Energywallet Developers
Distributed under the AGPL 3.0 with the OpenSSL exception, see the
accompanying file LICENSE or https://github.com/energyparty/energywallet
***********/
var VERSION = "1.8.0";
var PREFERENCES = {};

//Addresses
var DEFAULT_NUM_ADDRESSES = 1;
var MAX_ADDRESSES = 20;

var ORDER_DEFAULT_EXPIRATION = 4000;
var ORDER_MAX_EXPIRATION = 8000;

var STATS_MAX_NUM_TRANSACTIONS = 100;
var VIEW_PRICES_NUM_ASSET_PAIRS = 50;
var VIEW_PRICES_ASSET_PAIRS_REFRESH_EVERY = 2 * 60 * 1000;
var VIEW_PRICES_NUM_LATEST_TRADES = 50;
var VIEW_PRICES_LATEST_TRADES_REFRESH_EVERY = 2 * 60 * 1000;

var MARKET_INFO_REFRESH_EVERY = 5 * 60 * 1000;

var CHAT_NUM_USERS_ONLINE_REFRESH_EVERY = 5 * 60 * 1000;

var ALLOW_UNCONFIRMED = true;

// should be a i18n key
var ACTION_PENDING_NOTICE = "pending_notice";

var ARMORY_OFFLINE_TX_PREFIX = "=====TXSIGCOLLECT-";

var DEFAULT_PREFERENCES = {
  'num_addresses_used': DEFAULT_NUM_ADDRESSES,
  'address_aliases': {},
  'selected_theme': 'ultraLight',
  'selected_lang': 'en-us',
  'watch_only_addresses': [],
  'armory_offline_addresses': [],
  'has_accepted_license': false
};

var IS_MOBILE_OR_TABLET = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
var MAX_INT = Math.pow(2, 63) - 1;
var UNIT = 1000000;
var MIN_FEE = 1000;
var REGULAR_DUST_SIZE = 1000;
var MULTISIG_DUST_SIZE = 2000;
var MIN_PRIME_BALANCE = UNIT;
var ASSET_CREATION_FEE_XCP = 100;
var DIVIDEND_FEE_PER_HOLDER = 0.001
var MAX_ASSET_DESC_LENGTH = 41; //42, minus a null term character?
var FEE_FRACTION_REQUIRED_DEFAULT_PCT = .9;   //0.90% of total order
var FEE_FRACTION_PROVIDED_DEFAULT_PCT = 1;   //1.00% of total order
var FEE_FRACTION_DEFAULT_FILTER = .95;
var BTC_ORDER_MIN_AMOUNT = 1;
var B26_DIGITS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
var ORIG_REFERER = document.referrer;

var ENTITY_NAMES = {
  'burns': 'Burn',
  'debits': 'Debit',
  'credits': 'Credit',
  'sends': 'Send',
  'orders': 'Order',
  'order_matches': 'Order Match',
  'btcpays': 'ENRGPay',
  'issuances': 'Issuance',
  'broadcasts': 'Broadcast',
  'bets': 'Bet',
  'bet_matches': 'Bet Match',
  'dividends': 'Distribution',
  'cancels': 'Cancel',
  'callbacks': 'Callback',
  'bet_expirations': 'Bet Expired',
  'order_expirations': 'Order Expired',
  'bet_match_expirations': 'Bet Match Exp',
  'order_match_expirations': 'Order Match Exp',
  'rps': 'Rock-Paper-Scissors',
  'rps_matches': 'RPS Match',
  'rpsresolves': 'RPS Confirmed',
  'rps_expirations': 'RPS Expired',
  'rps_match_expirations': 'RPS Match Expired'
};

var ENTITY_ICONS = {
  'burns': 'fa-fire',
  'debits': 'fa-minus',
  'credits': 'fa-plus',
  'sends': 'fa-share',
  'orders': 'fa-bar-chart-o',
  'order_matches': 'fa-exchange',
  'btcpays': 'fa-btc',
  'issuances': 'fa-magic',
  'broadcasts': 'fa-rss',
  'bets': 'fa-bullseye',
  'bet_matches': 'fa-exchange',
  'dividends': 'fa-ticket',
  'cancels': 'fa-times',
  'callbacks': 'fa-retweet',
  'bet_expirations': 'fa-clock-o',
  'order_expirations': 'fa-clock-o',
  'bet_match_expirations': 'fa-clock-o',
  'order_match_expirations': 'fa-clock-o',
  'rps': 'fa-trophy',
  'rps_matches': 'fa-trophy',
  'rpsresolves': 'fa-trophy',
  'rps_expirations': 'fa-trophy',
  'rps_match_expirations': 'fa-trophy'
};

var ENTITY_NOTO_COLORS = {
  'burns': 'bg-color-yellow',
  'debits': 'bg-color-red',
  'credits': 'bg-color-green',
  'sends': 'bg-color-orangeDark',
  'orders': 'bg-color-blue',
  'order_matches': 'bg-color-blueLight',
  'btcpays': 'bg-color-orange',
  'issuances': 'bg-color-pinkDark',
  'broadcasts': 'bg-color-magenta',
  'bets': 'bg-color-teal',
  'bet_matches': 'bg-color-teal',
  'dividends': 'bg-color-pink',
  'cancels': 'bg-color-red',
  'callbacks': 'bg-color-pink',
  'bet_expirations': 'bg-color-grayDark',
  'order_expirations': 'bg-color-grayDark',
  'bet_match_expirations': 'bg-color-grayDark',
  'order_match_expirations': 'bg-color-grayDark',
  'rps': 'bg-color-blue',
  'rps_matches': 'bg-color-blueLight',
  'rpsresolves': 'bg-color-blue',
  'rps_expirations': 'bg-color-blueLight',
  'rps_match_expirations': 'bg-color-blueLight'
};

var BET_TYPES = {
  0: "Bullish CFD",
  1: "Bearish CFD",
  2: "Equal",
  3: "Not Equal"
};

var BET_TYPES_SHORT = {
  0: "BullCFD",
  1: "BearCFD",
  2: "Equal",
  3: "NotEqual"
}

var BET_TYPES_ID = {
  "BullCFD": 0,
  "BearCFD": 1,
  "Equal": 2,
  "NotEqual": 3
}

var COUNTER_BET = {
  "Equal": 3,
  "NotEqual": 2,
  "BullCFD": 1,
  "BearCFD": 0
}

var BET_MATCHES_STATUS = {
  "settled: liquidated for bear": 0,
  "settled: liquidated for bull": 1,
  "settled: for equal": 2,
  "settled: for notequal": 3
}

var LEVERAGE_UNIT = 5040;
var BURN_MULTIPLIER = 200;
var MAINNET_UNSPENDABLE = 'e26VazRWKbdcEspyFbeKcY3NuQhnUNMBCG';
var TESTNET_UNSPENDABLE = 'mfWxJ45yp2SFn7UciZyNpvDKrzbhyfKrY8';
var TESTNET_BURN_START = 260;
var TESTNET_BURN_END = TESTNET_BURN_START + 10512260;

/***********
 * DYNAMICALLY SET
 ***********/
var TESTNET_PASSPHRASE = qs("passphrase");

var CRYPTED_PASSPHRASE;
if (location.hash.indexOf('cp=') == 1) {
  CRYPTED_PASSPHRASE = location.hash.substr(4);
  location.hash = '';
}
location.hash = '';

//CONSTANTS THAT DEPEND ON IS_DEV / USE_TESTNET
var USER_COUNTRY = '';
var CURRENT_PAGE_URL = '';

//selective disablement
var DISABLED_FEATURES_SUPPORTED = ['betting', 'dividend', 'exchange', 'stats', 'history'];
var DISABLED_FEATURES = [];

// restricted action
var RESTRICTED_AREA = {
  'pages/betting.html': ['US'],
  'pages/openbets.html': ['US'],
  'pages/matchedbets.html': ['US'],
  'dividend': ['US']
}

var QUOTE_ASSETS = [];

var BETTING_ENABLE = true;

function qs(key) {
  //http://stackoverflow.com/a/7732379
  key = key.replace(/[*+?^$.\[\]{}()|\\\/]/g, "\\$&"); // escape RegEx meta chars
  var match = location.search.match(new RegExp("[?&]"+key+"=([^&]+)(&|$)"));
  return match && decodeURIComponent(match[1].replace(/\+/g, " "));
}

var IS_DEV = (location.pathname == "/" && qs("dev") && qs("dev") != '0' ? true : false);
var USE_TESTNET = (   (((location.pathname == "/" || location.pathname == "/src/" || location.pathname == "/build/") && qs("testnet") && qs("testnet") != '0')
                   || location.hostname.indexOf('testnet') != -1) ? true : false
                  );

var BLOCKEXPLORER_URL = "http://explorer.energywallet.eu";
var GOOGLE_ANALYTICS_UAID = null;
var ROLLBAR_ACCESS_TOKEN = null;

var TRANSACTION_DELAY = 5000;
var TRANSACTION_MAX_RETRY = 5;

var DONATION_ADDRESS = USE_TESTNET ? 'xnV9kfQFxzPvSYoSuZVqRJduLxdhyziFKiZ' : 'ePvnQvX5RbzDCzt3qSB5TmBz89BJMvpG46';

var APPROX_SECONDS_PER_BLOCK = USE_TESTNET ? 150 : 150;
