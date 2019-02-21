/*
Copyright (c) 2016-Present Energyparty and Energywallet Developers
Distributed under the AGPL 3.0 with the OpenSSL exception, see the
accompanying file LICENSE or https://github.com/energyparty/energywallet
*/

Counterblock = {};

Counterblock.getBalances = function(addresses, cwkeys, callback) {

  WALLET.retriveBTCAddrsInfo(addresses, function(btcData) {
    failoverAPI("get_normalized_balances", {'addresses': addresses}, function(assetsData, endpoint) {
      var data = {};
      for (var i in assetsData) {
        e = assetsData[i];
        data[e.address] = data[e.address] || {};
        data[e.address][e.asset] = {
          'balance': e.quantity,
          'owner': e.owner
        }
      }
      for (var i in btcData) {
        e = btcData[i];
        if (data[e.addr] || e.confirmedRawBal>0) {
          data[e.addr] = data[e.addr] || {};
          data[e.addr]['ENRG'] = {
            'balance': e.confirmedRawBal,
            'txouts': e.rawUtxoData.length  
          }; 
          if (cwkeys[e.addr]) {
            data[e.addr]['ENRG']['privkey'] = cwkeys[e.addr].getWIF();
          }
        }        
      }
      callback(data);
    });
  });

}
