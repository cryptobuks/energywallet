/*
Copyright (c) 2016-Present Energyparty and Energywallet Developers
Distributed under the AGPL 3.0 with the OpenSSL exception, see the
accompanying file LICENSE or https://github.com/energyparty/energywallet
*/

function MessageFeed() {
  var self = this;
  self.lastMessageIndexReceived = ko.observable(0);
  self.lastMessageSeqReceived = ko.observable(0);
  self.OPEN_ORDERS = [];
  self.POLL_INTERVAL = 60000;

  self.init = function(last_message_index, cw_last_message_seq) {
    self.lastMessageIndexReceived(last_message_index);
    self.lastMessageSeqReceived(cw_last_message_seq);
    self.checkMessageQueue();
  }

  self.checkMessageQueue = function() {
    var event = null, result = null;

    $.jqlog.debug("checkMessageQueue. last_seq: " + self.lastMessageSeqReceived());

    nonFailoverAPI("get_latest_wallet_messages", {'last_seq': self.lastMessageSeqReceived()},
    function(messages) {
      for (var i = 0; i < messages.length; i++) {
        self.parseMessage(messages[i]['_id'], messages[i]['when'], messages[i]['message']);
      }

      setTimeout(function() { self.checkMessageQueue(); }, self.POLL_INTERVAL);
    }, function(jqXHR, textStatus, errorThrown, endpoint) {
      var message = describeError(jqXHR, textStatus, errorThrown);
      $.jqlog.warn("Could not pull latest wallet messages; Error: " + message);

      setTimeout(function() { self.checkMessageQueue(); }, self.POLL_INTERVAL);
    });
  }

  self.removeOrder = function(hash) {
    var address = false
    for (var i in self.OPEN_ORDERS) {
      if (self.OPEN_ORDERS[i]['tx_hash'] == hash) {
        address = self.OPEN_ORDERS[i]['source'];
        self.OPEN_ORDERS = self.OPEN_ORDERS.splice(i, 1);
      }
    }
    return address;
  }

  self.restoreOrder = function() {
    //Get and populate any open orders we have
    var addresses = WALLET.getAddressesList();
    var filters = {'field': 'source', 'op': 'IN', 'value': addresses};
    failoverAPI("get_orders", {'filters': filters, 'show_expired': false, 'filterop': 'or'},
      function(data, endpoint) {
        self.OPEN_ORDERS = $.grep(data, function(e) { return e['status'] == 'open' && e['give_remaining'] > 0; });
      }
    );
  }
  
  self.getTxHash = function(message) {
    var txHash = message['event'] || message['tx_hash'] || (message['tx0_hash'] + message['tx1_hash']) || null;
    if(!txHash)
      $.jqlog.warn("Cannot derive a txHash for IDX " + message['_message_index'] + " (category: " + message['_category'] + ")");
    return txHash;
  }
  
  self.parseMempoolTransaction = function(txHash, category, message) {

    message['bindings'] = JSON.parse(message['bindings']);
    message['bindings']['mempool'] = true;

    var displayTx = false;
    
    if (!WALLET.getAddressObj(message['bindings']['source'])) {
      if (category == 'sends') {
        if (WALLET.getAddressObj(message['bindings']['destination'])) {
          displayTx = false;
        }
      } else if (category == 'issuances' && message['bindings']['transfer']) {
        if (WALLET.getAddressObj(message['bindings']['issuer'])) {
          message['bindings']['transfer_destination'] = message['bindings']['issuer'];
          displayTx = true;
        }
      } else if (category == 'dividends') {
        if (WALLET.isAssetHolder(message['bindings']['asset'])) {
          displayTx = true;
        }
      }
    }

    if (displayTx) {
      var asset1 = message['bindings']['asset'] || 'ENRG';
      WALLET.getAssetsDivisibility([asset1], function(divisibility) {

        message['bindings']['divisible'] = divisibility[asset1];
        message['bindings']['tx_index'] = message['_message_index'];
        
        if (category == 'dividends') {

          var asset2 = message['bindings']['dividend_asset'];
          WALLET.getAssetsDivisibility([asset2], function(asset_divisibility) {
            message['bindings']['dividend_asset_divisible'] = asset_divisibility[asset2];
            PENDING_ACTION_FEED.add(txHash, category, message['bindings']);
          });

        } else {
          PENDING_ACTION_FEED.add(txHash, category, message['bindings']);
        }

      });
    }
    
  }
  
  self.parseMessage = function(seq, when, message) {
    if(!message || (message.substring && message.startswith("<html>"))) return;
    //^ sometimes nginx can trigger this via its proxy handling it seems, with a blank payload (or a html 502 Bad Gateway
    // payload) -- especially if the backend server reloads. Just ignore it.
    assert(self.lastMessageIndexReceived(), "lastMessageIndexReceived is not defined!");

    $.jqlog.info("feed:receive IDX=" + message['_message_index']);

    if (seq != self.lastMessageSeqReceived() + 1) {
      $.jqlog.warn("Received message seq (" + seq + ") is not newer than lastMessageSeqReceived (" + self.lastMessageSeqReceived() + "). Message: " + JSON.stringify(message));
      return;
    }

    self.lastMessageSeqReceived(self.lastMessageSeqReceived() + 1);
    var txHash = self.getTxHash(message);
    var category = message['_category'];

    //Handle zeroconf transactions
    if (message['_message_index'] == 'mempool') {
      self.parseMempoolTransaction(txHash, category, message);
      return;
    }

    if (message['_message_index'] > self.lastMessageIndexReceived() + 1) {
      $.jqlog.warn("Received message index (" + message['_message_index'] + ") is != lastMessageIndexReceived (" + self.lastMessageIndexReceived() + "). Message: " + JSON.stringify(message));
      return;
    }

    assert(self.lastMessageIndexReceived() + 1 == message['_message_index'], "Message feed resync counter increment oddity...?");
  
    $.jqlog.info("feed:PROCESS MESSAGE=" + category + ", IDX=" + message['_message_index'] + " (last idx: "
      + self.lastMessageIndexReceived() + "), TX_HASH=" + txHash + ", CONTENTS=" + JSON.stringify(message));
  
    self.lastMessageIndexReceived(self.lastMessageIndexReceived() + 1);
      
    //Detect a reorg and refresh the current page if so.
    if(message['_command'] == 'reorg') {
      //Don't need to adjust the message index
      self.lastMessageIndexReceived(message['_last_message_index']);
      $.jqlog.warn("feed:Blockchain reorganization at block " + message['block_index']
        + "; last message idx reset to " + self.lastMessageIndexReceived());
      setTimeout(function() { WALLET.refreshCounterpartyBalances(WALLET.getAddressesList(), checkURL); }, randomIntFromInterval(1, 5) * 1000);
      return;
    }

    if (message['block_index'])
      WALLET.networkBlockHeight(message['block_index']);

    if(message['_command'] != 'insert' && (category != "orders" && category != "bets"))
      return;

    //If we received an action originating from an address in our wallet that was marked invalid by the network, let the user know
    // (do this even in cases where the entry does not exist in pendingActions, as the user could have logged out and back in)
    if(message['_status'] && _.startsWith(message['_status'], 'invalid') && WALLET.getAddressObj(message['source'])) {
      var actionText = PendingActionViewModel.calcText(category, message); //nice "good enough" shortcut method here
      bootbox.alert("<b class='errorColor'>" + i18n.t('network_processing_failed') + ":</b><br/><br/>"
        + actionText + "<br/><br/><b>" + i18n.t("reason") + ":</b> " + message['_status']);
    }

    //Insert the message into the stats page (if it has been initialized)
    if(window.hasOwnProperty('STATS_TXN_HISTORY')) {
      window.STATS_TXN_HISTORY.addMessage(message);
    }
      
    //remove any pending message from the pending actions pane (we do this before we filter out invalid messages
    // because we need to be able to remove a pending action that was marked invalid as well)
    PENDING_ACTION_FEED.remove(txHash, category);

    if(_.startsWith(message['_status'], 'invalid'))
      return; //ignore message
    if(message['_status'] == 'expired') {
      //ignore expired orders and bets, but we have order_expirations and bet_expiration inserts that we DO look at
      assert(category == "orders" || category == "bets", "Got an 'expired' message for a category of: " + category);
      return;
    }
    
    //notify the user in the notification pane
    NOTIFICATION_FEED.add(category, message);

    // address with potential change in escrowed balance
    var refreshEscrowedBalance = [];
    
    //Have the action take effect (i.e. everything besides notifying the user in the notifcations pane, which was done above)
    if(category == "balances") {
      //DO NOTHING
    } else if(category == "credits" || category == "debits") {
      if(WALLET.getAddressObj(message['address'])) {
        WALLET.updateBalance(message['address'], message['asset'], message['_balance']);
        refreshEscrowedBalance.push(message['address']);
      }
    } else if(category == "broadcasts") {
    } else if(category == "burns") {
    } else if(category == "cancels") {
      
      if (WALLET.getAddressObj(message['source'])) {
        //Remove the canceled order from the open orders list
        // NOTE: this does not apply as a pending action because in order for us to issue a cancellation,
        // it would need to be confirmed on the blockchain in the first place
        self.removeOrder(message['offer_hash']);
        refreshEscrowedBalance.push(message['source']);
      }

    } else if(category == "dividends") {
    } else if(category == "issuances") {

      var addressesWithAsset = WALLET.getAddressesWithAsset(message['asset']);
      for(var i=0; i < addressesWithAsset.length; i++) {
        WALLET.getAddressObj(addressesWithAsset[i]).addOrUpdateAsset(message['asset'], message, null);
      }
      //Also, if this is a new asset creation, or a transfer to an address that doesn't have the asset yet
      if(WALLET.getAddressObj(message['issuer']) && addressesWithAsset.length && !(addressesWithAsset.indexOf(message['issuer']) != -1)) {
        failoverAPI("get_asset_info", {'assets': [message['asset']]}, function(assetsInfo, endpoint) {
          WALLET.getAddressObj(message['issuer']).addOrUpdateAsset(message['asset'], assetsInfo[0], null); //will show with a 0 balance
        });    
      }

    } else if(category == "sends") {
      //the effects of a send are handled based on the credit and debit messages it creates, so nothing to do here
    } else if(category == "orders") {
      if(message['_btc_below_dust_limit'])
        return;
      
      //valid order statuses: open, filled, invalid, cancelled, and expired
      //update the give/get remaining numbers in the open orders listing, if it already exists
      var match = ko.utils.arrayFirst(self.OPEN_ORDERS, function(item) {
          return item['tx_hash'] == message['tx_hash'];
      });
      if(match) {
        if(message['_status'] != 'open') { //order is filled, expired, or cancelled, remove it from the listing
          self.removeOrder(message['tx_hash']);
        }
      } else if(WALLET.getAddressObj(message['source'])) {
        //order is not in the open orders listing, but should be
        self.OPEN_ORDERS.push(message);
      }
      refreshEscrowedBalance.push(message['source']);

    } else if(category == "order_matches") {

      if(message['_btc_below_dust_limit'])
        return;

      refreshEscrowedBalance.push(message['tx0_address']);
      refreshEscrowedBalance.push(message['tx1_address']);

    } else if(category == "order_expirations") {
      //Remove the order from the open orders list
      self.removeOrder(message['order_hash']);

      refreshEscrowedBalance.push(message['source']);
    
    } else if(category == "order_match_expirations") {

      refreshEscrowedBalance.push(message['tx0_address']);
      refreshEscrowedBalance.push(message['tx1_address']);

    } else if(category == "bets") {
      
      refreshEscrowedBalance.push(message['source']);

    } else if(category == "bet_matches") {

      refreshEscrowedBalance.push(message['tx0_address']);
      refreshEscrowedBalance.push(message['tx1_address']);

    } else if(category == "bet_expirations") {
      
      refreshEscrowedBalance.push(message['source']);

    } else if(category == "bet_match_expirations") {

      refreshEscrowedBalance.push(message['tx0_address']);
      refreshEscrowedBalance.push(message['tx1_address']);

    } else {
      $.jqlog.error("Unknown message category: " + category);
    }

    for (var i in refreshEscrowedBalance) {
      var addressObj = WALLET.getAddressObj(refreshEscrowedBalance[i]);
      if (addressObj) {
        addressObj.updateEscrowedBalances();
      }
    }
  }


}
