/*
Copyright (c) 2016-Present Energyparty and Energywallet Developers
Distributed under the AGPL 3.0 with the OpenSSL exception, see the
accompanying file LICENSE or https://github.com/energyparty/energywallet
*/

var TIMEOUT_FAILOVER_API = 120000; // 2 minuts (in ms)
var TIMEOUT_MULTI_API = 120000; // 2 minuts (in ms)
var TIMEOUT_OTHER = 120000; // 2 minuts (in ms)

//Inlude a .url param in every jqXHR object -- http://stackoverflow.com/a/11980396
$.ajaxSetup({
    beforeSend: function(jqXHR, settings) {
        jqXHR.url = settings.url;
    }
});

function describeError(jqXHR, textStatus, errorThrown) {
    var message;
    var statusErrorMap = {
        '400' : "Server understood the request but request content was invalid.",
        '401' : "Unauthorised access.",
        '403' : "Forbidden resouce can't be accessed",
        '500' : "Internal Server Error.",
        '503' : "Service Unavailable",
        '525' : "The server is not fully caught up to the blockchain. Please logout and try later. (Most likely this message is due to the server being updated.)" //custom
    };
    if (jqXHR && jqXHR.status) {
        message =statusErrorMap[jqXHR.status];
    } else if(textStatus=='parsererror') {
      message = "Error.\nParsing JSON Request failed.";
    } else if(textStatus=='timeout') {
      message = "Request Time out.";
    } else if(textStatus=='abort') {
      message = "Request was aborted by the server";
    //} else if(textStatus.match("^JSON\-RPC Error:")) {
    } else if(errorThrown == "jsonrpc") {
      message = textStatus;
    } else if(errorThrown) {
      message = errorThrown;
    } else {
      message = "Unknown Error.";
    }

    return message;
}

function defaultErrorHandler(jqXHR, textStatus, errorThrown, endpoint) {
  if(typeof(endpoint)==='undefined') endpoint = jqXHR.url;
  var message = describeError(jqXHR, textStatus, errorThrown);
  bootbox.alert("Error making request to " + endpoint + ": " + message);
}

function urlsWithPath(urls, path) {
  return $.map(urls, function(element) { return element + path; });
}

function fetchData(url, onSuccess, onError, postdata, extraAJAXOpts, isJSONRPC, _url_n) {
  var u = null;
  if(typeof(onError)==='undefined' || onError == "default")
    onError = function(jqXHR, textStatus, errorThrown) { return defaultErrorHandler(jqXHR, textStatus, errorThrown, u) };
  if(typeof(postdata)==='undefined') postdata = null;
  if(typeof(isJSONRPC)==='undefined') isJSONRPC = false;
  if(typeof(extraAJAXOpts)==='undefined') extraAJAXOpts = {};
  if(typeof(_url_n)==='undefined') _url_n = 0;
  if(extraAJAXOpts['cache'] === undefined) extraAJAXOpts['cache'] = false;

  u = url;
  if (url instanceof Array) {
    u = url[_url_n]; // u = url to attempt this time
  }

  var ajaxOpts = {
      type: !postdata ? "GET" : "POST",
      data: postdata,
      //crossDomain: true,
      url: u,
      success: function(res) {
        if(onSuccess) {
          if(isJSONRPC) {
            if(res && res.hasOwnProperty('result')) {
              onSuccess(res['result'], u);
            } else {
              var errorMessage = null;
              if(res['error'] === undefined) {
                errorMessage = "JSON-RPC Error -- UNKNOWN FORMAT: " + res;
              } else {
                errorMessage = ("JSON-RPC Error: "
                  + "<p><b>Type:</b> " + res['error']['message'] + "</p>"
                  + "<p><b>Code:</b> " + res['error']['code'] + "</p>"
                  + "<p><b>Message:</b> " + (res['error']['data'] ? res['error']['data']['message'] : "UNSPECIFIED") + "</p>");
              }
              onError(null, errorMessage, "jsonrpc", u);
            }
          } else {
            onSuccess(res, u);
          }
        }
      },
      error:function (jqXHR, opt, err) {
        if(url instanceof Array) {
          if(url.length <= _url_n + 1) {
            //no more urls to hit...finally call error callback (if there is one)
            if (onError) return onError(jqXHR, opt, err, u);
          } else {
            //try the next URL
            return fetchData(url, onSuccess, onError, postdata, extraAJAXOpts, isJSONRPC, _url_n + 1);
          }
        } else {
          if (onError) return onError(jqXHR, opt, err, u);
        }
      }
  }
  if(extraAJAXOpts) {
    for (var attrname in extraAJAXOpts) { ajaxOpts[attrname] = extraAJAXOpts[attrname]; }
  }
  $.ajax(ajaxOpts);
}

function _formulateEndpoints(endpoints, qs) {
  var newEndpoints = [];
  if(!(endpoints instanceof Array)) endpoints = [endpoints];
  for(var i=0; i < endpoints.length; i++) {
    newEndpoints.push(endpoints + "?" + qs);
  }
  return newEndpoints;
}

function _encodeForJSONRPCOverGET(params) {
  //This may be non-standard with JSON RPC 2.0...going off of http://www.jsonrpc.org/historical/json-rpc-over-http.html#get
  return encodeURIComponent(bytesToBase64(stringToBytes(JSON.stringify(params))));
}

function makeJSONRPCCall(endpoints, method, params, timeout, onSuccess, onError) {
  var extraAJAXOpts = {
    'contentType': 'application/json; charset=utf-8',
    'dataType': 'json'
  }
  if(timeout) extraAJAXOpts['timeout'] = timeout;

  return fetchData(endpoints,
     onSuccess, onError,
     JSON.stringify({
          "jsonrpc": "2.0",
          "id": 0,
          "method": method,
          "params": params
     }), extraAJAXOpts, true);
}

function _makeJSONAPICall(destType, endpoints, method, params, timeout, onSuccess, onError, httpMethod) {
  if(typeof(onError)==='undefined')
    onError = function(jqXHR, textStatus, errorThrown, endpoint) {
      return defaultErrorHandler(jqXHR, textStatus, errorThrown, method + "@" + destType)
    };
  if(typeof(httpMethod)==='undefined') httpMethod = "POST"; //default to POST
  assert(httpMethod == "POST" || httpMethod == "GET", "Invalid HTTP method");

  if(destType == "counterblockd") {
    makeJSONRPCCall(endpoints, method, params, timeout, onSuccess, onError);
  } else if(destType == "counterpartyd") {
    makeJSONRPCCall(endpoints, "proxy_to_counterpartyd", {"method": method, "params": params }, timeout, onSuccess, onError);
  }
}

function _getDestTypeFromMethod(method) {
  var destType = "counterpartyd";
  if(['is_ready', 'get_reflected_host_info', 'is_chat_handle_in_use','record_btc_open_order',
      'get_messagefeed_messages_by_index', 'get_normalized_balances', 'get_required_btcpays',
      'get_chain_address_info', 'get_chain_block_height', 'get_chain_txns_status',
      'get_preferences', 'store_preferences',
      'get_raw_transactions', 'get_balance_history', 'get_last_n_messages',
      'get_owned_assets', 'get_asset_history', 'get_asset_extended_info', 'get_transaction_stats', 'get_wallet_stats', 'get_asset_pair_market_info',
      'get_market_price_summary', 'get_market_price_history', 'get_market_info', 'get_market_info_leaderboard', 'get_market_cap_history',
      'get_order_book_simple', 'get_order_book_buysell', 'get_trade_history',
      'get_bets', 'get_user_bets', 'get_feed', 'get_feeds_by_source',
      'parse_base64_feed', 'get_open_rps_count', 'get_user_rps',
      'get_users_pairs', 'get_market_orders', 'get_market_trades', 'get_markets_list', 'get_market_details',
      'get_pubkey_for_address', 'create_armory_utx', 'convert_armory_signedtx_to_raw_hex', 'create_support_case',
      'get_escrowed_balances', 'proxy_to_autobtcescrow', 'get_vennd_machine', 'get_script_pub_key', 'get_latest_wallet_messages'].indexOf(method) >= 0) {
    destType = "counterblockd";
  }
  return destType;
}

function supportUnconfirmedChangeParam(method) {
  return method.split("_").shift()=="create" && _getDestTypeFromMethod(method)=="counterpartyd";
}

function _multiAPIPrimative(method, params, onFinished) {
  var gatheredResults = [];
  var destType = _getDestTypeFromMethod(method);

  for(var i=0;i < cwAPIUrls().length; i++) {
    _makeJSONAPICall(destType, cwAPIUrls()[i], method, params, TIMEOUT_MULTI_API,
    function(data, endpoint) { //success callback
      gatheredResults.push({'success': true, 'endpoint': endpoint, 'data': data});

      if(gatheredResults.length == cwAPIUrls().length) {
        onFinished(gatheredResults);
      }
    },
    function(jqXHR, textStatus, errorThrown, endpoint) { //error callback
      gatheredResults.push({'success': false, 'endpoint': endpoint, 'jqXHR': jqXHR, 'textStatus': textStatus, 'errorThrown': errorThrown});

      if(gatheredResults.length == cwAPIUrls().length) {

        if(method != "is_ready") {
          var allNotCaughtUp = true;
          for(var j=0;j < gatheredResults.length; j++) {
            if(!gatheredResults['jqXHR'] || gatheredResults['jqXHR'].status != '525') {
              allNotCaughtUp = false;
              break;
            }
          }
          if(allNotCaughtUp) {
            bootbox.alert("The server(s) are currently updating and/or not caught up to the blockchain. Logging you out."
              + " Please try logging in again later. (Most likely this message is due to the server being updated.)")
            location.reload(false); //log the user out to avoid ruckus
            return;
          }
        }

        //if this is the last result to come back, then trigger the callback
        onFinished(gatheredResults);
      }
    });
  }
}

function nonFailoverAPI(method, params, onSuccess, onError) {
  if (typeof(onError) === 'undefined') {
    onError = function(jqXHR, textStatus, errorThrown, endpoint) {
      var message = describeError(jqXHR, textStatus, errorThrown);
      bootbox.alert("nonFailoverAPI: Call failed (on 'primary' server only). Method: " + method + "; Last error: " + message);
    };
  }

  //525 DETECTION (needed here and in _multiAPIPrimative) - wrap onError (so that this works even for user supplied onError)
  var onErrorOverride = function(jqXHR, textStatus, errorThrown, endpoint) {
    if (jqXHR && jqXHR.status == '525') {
      bootbox.alert("The server(s) are currently updating and/or not caught up to the blockchain. Logging you out. Please try logging in again later. (e:failoverAPI)")
      location.reload(false); //log the user out to avoid ruckus
      return;
    }
    return onError(jqXHR, textStatus, errorThrown, endpoint);
  }

  var destType = _getDestTypeFromMethod(method);
  _makeJSONAPICall(destType, cwAPIUrls()[0], method, params, TIMEOUT_FAILOVER_API, onSuccess, onErrorOverride);
}

function failoverAPI(method, params, onSuccess, onError) {
  if(typeof(onError)==='undefined') {
    onError = function(jqXHR, textStatus, errorThrown, endpoint) {
      var message = describeError(jqXHR, textStatus, errorThrown);
      bootbox.alert("failoverAPI: Call failed (across all servers). Method: " + method + "; Last error: " + message);
    };
  }
  //525 DETECTION (needed here and in _multiAPIPrimative) - wrap onError (so that this works even for user supplied onError)
  onErrorOverride = function(jqXHR, textStatus, errorThrown, endpoint) {
    if(jqXHR && jqXHR.status == '525') {
      bootbox.alert("The server(s) are currently updating and/or not caught up to the blockchain. Logging you out. Please try logging in again later. (e:failoverAPI)")
      location.reload(false); //log the user out to avoid ruckus
      return;
    }
    return onError(jqXHR, textStatus, errorThrown, endpoint);
  }

  var destType = _getDestTypeFromMethod(method);
  _makeJSONAPICall(destType, cwAPIUrls(), method, params, TIMEOUT_FAILOVER_API, onSuccess, onErrorOverride);
}

function multiAPI(method, params, onSuccess, onError) {
  if(typeof(onError)==='undefined') {
    onError = function(jqXHR, textStatus, errorThrown, endpoint) {
      var message = describeError(jqXHR, textStatus, errorThrown);
      bootbox.alert("multiAPI: Parallel call failed (no server returned success). Method: " + method + "; Last error: " + message);
    };
  }

  _multiAPIPrimative(method, params, function(results) {
    //look for the first success and use that...
    for(var i=0; i < results.length; i++) {
      if(results[i]['success']) {
        return onSuccess ? onSuccess(results[i]['data'], results[i]['endpoint']) : true;
      }
    }

    //if here, no servers returned success...
    return onError(results[i-1]['jqXHR'], results[i-1]['textStatus'], results[i-1]['errorThrown'], results[i-1]['endpoint']);
  });
}

function multiAPIConsensus(method, params, onSuccess, onConsensusError, onSysError) {
  if(typeof(onConsensusError)==='undefined') {
    onConsensusError = function(unmatchingResultsList) {
      bootbox.alert("multiAPIConsensus: Consensus failed. Method: " + method + "; Unmatching results were: " + JSON.stringify(unmatchingResultsList));
    };
  }
  if(typeof(onSysError)==='undefined') {
    onSysError = function(jqXHR, textStatus, errorThrown, endpoint) {
      $.jqlog.debug(textStatus);
      var message = textStatus;
      var noBtcPos = textStatus.indexOf("Insufficient ENRG");
      if (noBtcPos != -1) {
        var endMessage = textStatus.indexOf(")", noBtcPos) + 1;

        message = '<b class="errorColor">' + textStatus.substr(noBtcPos, endMessage-noBtcPos)
          + '</b>. You must have a small amount of ENRG in this address to pay the EnergyCoin miner fees. Please fund this address and try again.<br/><br/>';

      } else {
        message = describeError(jqXHR, textStatus, errorThrown);
        message = "Sorry, we got an error when trying to do the requested action: '" + message + "' (API method: " + method + ").<br/><br/>"
          + "If this persists, please click on the question mark button on the top right-hand corner of the screen for support options.";
      }
      bootbox.alert(message);
    };
  }

  _multiAPIPrimative(method, params, function(results) {
    var successResults = [];
    var i = 0;
    for(i=0; i < results.length; i++) {
      if(results[i]['success']) {
        successResults.push(results[i]['data']);
      }
    }

    if(!successResults.length) { //no successful results
      return onSysError(results[i-1]['jqXHR'], results[i-1]['textStatus'], results[i-1]['errorThrown'], results[i-1]['endpoint']);
    }

    if (!CWBitcore.compareOutputs(params['source'], successResults)) {
      return onConsensusError(successResults); //not all consensus data matches
    }

    //if here, all is well
    if(onSuccess) {
      onSuccess(successResults[successResults.length-1], cwAPIUrls().length, successResults.length);
    }
  });
}

function multiAPINewest(method, params, newestField, onSuccess, onError) {
  if(typeof(onError)==='undefined') {
    onError = function(jqXHR, textStatus, errorThrown, endpoint) {
      var message = describeError(jqXHR, textStatus, errorThrown);
      bootbox.alert("multiAPINewest: Parallel call failed (no server returned success). Method: " + method + "; Last error: " + message);
    };
  }

  _multiAPIPrimative(method, params, function(results) {
    var successResults = [];
    var i = 0;
    for(i=0; i < results.length; i++) {
      if(results[i]['success']) {
        successResults.push(results[i]);
      }
    }

    if(!successResults.length) { //no successful results
      return onError(results[i-1]['jqXHR'], results[i-1]['textStatus'], results[i-1]['errorThrown'], results[i-1]['endpoint']);
    }

    //grab the newest result
    var newest = null;
    for(i=0; i < successResults.length; i++) {
      if(   successResults[i]['data']
         && successResults[i]['data'].hasOwnProperty(newestField)
         && successResults[i]['data'][newestField]
         && (newest == null || successResults[i]['data'][newestField] > successResults[newest]['data'][newestField])) {
        newest = i;
      }
    }

    if(onSuccess && newest != null) {
      onSuccess(successResults[newest]['data'], successResults[newest]['endpoint']);
    } else if(onSuccess && newest == null) {
      onSuccess(null, null); //at least one server returned a non-error, but the data was empty
    }
  });
}
