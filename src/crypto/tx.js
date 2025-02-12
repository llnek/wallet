// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// Copyright © 2025, Kenneth Leung. All rights reserved.

;(function(gscope,UNDEF){

  //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
  //original ideas and source from https://github.com/lhartikk/naivecoin
  //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

  "use strict";

  /**Create the module.
  */
  function _module(Core, CryptoJS, ECDSA){

    /**
     * @module mcfud/crypto/transaction
     */

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    const EC = new ECDSA.ec("secp256k1");
    const COINBASE_AMOUNT= 50;
    const {u:_, is}= Core;

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    function UnspentRec(txOutId, txOutIndex, address, amount){
      return{ txOutId, txOutIndex, address, amount }
    }

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    function TxIn(txOutId, txOutIndex, signature=""){
      return{
        txOutId, txOutIndex, signature,
        toString(){
          return ""+this.txOutId+this.txOutIndex+this.signature } }
    }

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    function TxOut(address, amount){
      return{
        address, amount,
        toString(){ return ""+this.address+this.amount } }
    }

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    function Transaction(id, txIns, txOuts){
      return{
        id, txIns, txOuts,
        toString(){ return ""+this.id+this.txIns.toString()+this.txOuts.toString() } }
    }

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    function validateTx(t, unspent){
      function getAmount(x){
        let r= findUnspentRec(x.txOutId, x.txOutIndex, unspent);
        return _.assert(r, "failed to find unspent-rec") && r.amount;
      }
      function check(txIn){
        let ref= unspent.find(x=> x.txOutId == txIn.txOutId &&
                                  x.txOutIndex == txIn.txOutIndex);
        return ref && EC.keyFromPublic(ref.address, "hex").verify(t.id, txIn.signature);
      }
      if(_$.getTransactionId(t) != t.id){
        return console.error(`invalid tx id: ${t.id}`)
      }
      for(let i=0; i<t.txIns.length; ++i){
        if(!check(t.txIns[i]))
          return console.error(`invalid txIns in tx: ${t.id}`)
      }
      return t.txOuts.reduce((acc,x)=> acc + x.amount,0)==
             t.txIns.reduce((acc,x)=> acc+getAmount(x),0)
    }

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    function validateGrantTx(t, index){
      let msg;
      if(!t){
        msg="the first tx in the block must be a grant-tx"
      }else if(_$.getTransactionId(t) != t.id){
        msg=`invalid grant-tx id: ${t.id}`
      }else if(t.txIns.length != 1){
        msg="one txIn must be specified in the grant-tx"
      }else if(t.txIns[0].txOutIndex != index){
        msg="invalid txIn index in grant-tx"
      }else if(t.txOuts.length != 1){
        msg="invalid number of txOuts in grant-tx"
      }else if(t.txOuts[0].amount != COINBASE_AMOUNT){
        msg="invalid amount in grant-tx"
      }
      if(msg)
        console.error(msg);
      return !msg;
    }

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    function validateBlockTxs(txs, index, unspent){
      function dup(txIns){
        for(let s,x,bin=new Map(), i=0; i< txIns.length; ++i){
          x=txIns[i];
          s= ""+ x.txOutId + x.txOutIndex;
          if(bin.has(s)) return true;
          bin.set(s,1);
        }
      }
      let msg;
      if(!validateGrantTx(txs[0], index)){
        msg="invalid tx[0]"
      }else if(dup(txs.map(x=> x.txIns).flat())){
        msg="duplicate txIns"
      }else{
        //all but the grant-tx
        for(let i=1; i< txs.length; ++i){
          if(!validateTx(txs[i], unspent)){
            msg="invalid tx";
            break;
          }
        }
      }
      if(msg)
        console.error(msg);
      return !msg;
    }

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    function findUnspentRec(id, index, unspent){
      return unspent.find(x=> x.txOutId == id && x.txOutIndex == index)
    }

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    function isValidTransactionShape(t){
      function isValidAddress(addr){
        //valid address is a valid ecdsa public key in the 04 + X-coordinate + Y-coordinate format
        let msg;
        if(addr.length != 130){
          msg="invalid public key length"
        }else if(!addr.match("^[a-fA-F0-9]+$")){
          msg="public key must contain only hex characters"
        }else if(!addr.startsWith("04")){
          msg="public key must start with 04"
        }
        if(msg) console.log(msg);
        return !msg;
      }
      function isValidTxInShape(txIn){
        let msg;
        if(!txIn){
          msg="txIn is null"
        }else if(!is.str(txIn.signature)){
          msg="invalid signature type in txIn"
        }else if(!is.str(txIn.txOutId)){
          msg="invalid txOutId type in txIn"
        }else if(!is.num(txIn.txOutIndex)){
          msg="invalid txOutIndex type in txIn"
        }
        if(msg) console.log(msg);
        return !msg;
      }
      function isValidTxOutShape(txOut){
        let msg;
        if(!txOut){
          msg="txOut is null"
        }else if(!is.str(txOut.address)){
          msg="invalid address type in txOut"
        }else if(!isValidAddress(txOut.address)){
          msg="invalid TxOut address"
        }else if(!is.num(txOut.amount)){
          msg="invalid amount type in txOut"
        }
        if(msg) console.log(msg);
        return !msg;
      }
      let msg;
      if(!is.str(t.id)){
        msg="transactionId missing"
      }else if(!(t.txIns instanceof Array)){
        msg="invalid txIns type in transaction"
      }else if(!t.txIns.map(isValidTxInShape).reduce((a,b) => (a && b), true)){
        msg="invalid txIn structure"
      }else if(!(t.txOuts instanceof Array)){
        msg="invalid txIns type in transaction"
      }
      if(msg)
        return console.error(msg);
      for(let i=0;i < t.txOuts.length;++i)
        if(!isValidTxOutShape(t.txOuts[i])) return false;
      ///
      return true;
    }

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    const _transactionPool= [];
    const _unspentRecs= [];

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    //MODULE EXPORT
    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    const _$={
      UnspentRec,
      TxIn,
      TxOut,
      Transaction,
      /**
       * @param {object} bc
       * @return {object}
       */
      lift(bc){
        bc.replaceChain=function(c){
          let
            out = this.isValidChain(c),
            valid= _.echt(out);
          if(valid && this.calcTotalDifficulty(c) > this.calcTotalDifficulty()){
            _$.setUnspentRecs(out);
            _$.updateTxPool(out);
            this.resetChain(c);
          }else{
            console.warn("received blockchain invalid")
          }
        };
        bc.addBlockToChain=function(b){
          if(this.isValidNewBlock(b, this.tailChain())){
            let ret= _$.processTxs(b.data, b.index, _unspentRecs);
            if(ret){
              _$.setUnspentRecs(ret);
              _$.updateTxPool(ret);
              return this.CHAIN_ADD(b);
            }
          }
        };
        bc.isValidChain = function(bc){
          if(!this.ensureRoot(bc[0])){ return UNDEF }
          let out=[];
          for(let cur,i=0; i< bc.length; ++i){
            cur= bc[i];
            if(i != 0 && !this.isValidNewBlock(bc[i], bc[i-1])){
              return UNDEF
            }
            out = _$.processTxs(cur.data, cur.index, out);
            if(!out)
              return console.warn("invalid transactions in blockchain");
          }
          return out;
        };
        bc.genRoot=function(){
          return [_$.genRoot()]
        }
        return bc;
      },
      genRoot(){
        return Transaction(
          "5e7a184fe16430f399d37a3e0197614ea3188624aa25b021139bb61a73fd412b",
          [TxIn("",0,"")],
          [TxOut("0429a91b39ad936a5e0690ffdb3136a554da25ba577182f6f187ba329e564a93cc5a3ee6f3258fe5139fd75d92851c85a3fb3f3f2b71e98ac254b8b73cc12db613",50) ]);
      },
      setUnspentRecs(r){
        _.append(_unspentRecs,r,true)
      },
      getUnspentRecs(){
        return JSON.parse(JSON.stringify(_unspentRecs))
      },
      processTxs(txs, index,unspent){
        function update(){
          let newOnes= txs.reduce((a,t)=>a.concat(
            t.txOuts.map((u,i)=>
            UnspentRec(t.id, i, u.address, u.amount))),[]);
          let used= txs.map(t=> t.txIns).flat().map(
            x=> UnspentRec(x.txOutId, x.txOutIndex, "", 0));
          return unspent.filter(x=> !findUnspentRec(x.txOutId, x.txOutIndex, used)).concat(newOnes);
        }
        if(txs.every(isValidTransactionShape) &&
           validateBlockTxs(txs, index, unspent)) return update();
      },
      getPublicKey(sk){
        return EC.keyFromPrivate(sk, "hex").getPublic().encode("hex");
      },
      genGrantTx(addr, index){
        let
          txIn= TxIn("",index,""),
          t = Transaction("", [txIn], [TxOut(addr, COINBASE_AMOUNT)]);
        t.id = this.getTransactionId(t);
        return t;
      },
      getTransactionId(t){
        return CryptoJS.SHA256(""+
                               t.txIns.reduce((acc,t)=> acc + ("" + t.txOutId + t.txOutIndex),"") +
                               t.txOuts.reduce((acc,t)=> acc + ("" + t.address + t.amount),"")).toString()
      },
      signTxIn(t, txInIndex, privateKey, unspent){
        function hex(arg){
          return Array.from(arg, b=> ("0" + (b&0xFF).toString(16)).slice(-2)).join("") }
        let
          txIn= t.txIns[txInIndex],
          ref= findUnspentRec(txIn.txOutId, txIn.txOutIndex, unspent);
        _.assert(ref, "could not find referenced txOut");
        if(getPublicKey(privateKey) != ref.address){
          _.assert(false,"trying to sign an input with private" +
                         "-key that does not match the address that is referenced in txIn")
        }
        return hex(EC.keyFromPrivate(privateKey, "hex").sign(t.id).toDER());
      },
      handleReceivedTx(t){
        this.addToTxPool(t, _unspentRecs)
      },
      getTxPool(){
        return JSON.parse(JSON.stringify(_transactionPool))
      },
      addToTxPool(tx, unspent){
        _.assert(validateTx(tx, unspent), "trying to add invalid tx to pool");
        _.assert(this.isValidTxForPool(tx), "trying to add invalid tx to pool");
        return _transactionPool.push(tx)>0;
      },
      hasTxIn(txIn, unspent){
        return unspent.find(u=> u.txOutId == txIn.txOutId && u.txOutIndex == txIn.txOutIndex)
      },
      updateTxPool(unspent){
        let invalid= [];
        for(let tx of _transactionPool){
          for(let txIn of tx.txIns){
            if(!this.hasTxIn(txIn, unspent)){
              invalid.push(tx);
              //break;
            }
          }
        }
        invalid.forEach(x=> _.disj(_transactionPool,x));
      },
      getTxPoolIns(){
        return _transactionPool.map(tx=> tx.txIns).flat()
      },
      isValidTxForPool(tx){
        let pins = this.getTxPoolIns();
        return tx.txIns.every(x=>
          !pins.find(p=> x.txOutIndex == p.txOutIndex && x.txOutId == p.txOutId));
      },
      init(BC,evt){
        _.append(_unspentRecs,this.processTxs(BC.getDataOf(0), 0,_unspentRecs),true);
        this.evtMsg=evt;
        return this;
      }
    };

    return _$;
  }

  //export--------------------------------------------------------------------
  if(typeof module == "object" && module.exports){
    module.exports=_module(require("../main/core"),
                           require("crypto-js"),
                           require("elliptic"))
  }else{
    gscope["io/czlab/mcfud/crypto/transaction"]=_module
  }

})(this);

