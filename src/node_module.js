/* Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Copyright © 2025, Kenneth Leung. All rights reserved. */


;(function(UNDEF){

  "use strict";


  /**Create the module.
  */
  function _module(PP,WA,BC,TX){
    return {
      P2P:PP,
      Wallet:WA,
      BlockChain:BC,
      Transaction:TX
    }
  }

  //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
  //exports
  if(typeof module=="object" && module.exports){
    module.exports=_module(require("./crypto/blockchain.js"),
      require("./crypto/p2p.js"),
      require("./crypto/tx.js"),
      require("./crypto/wallet.js")
    );
  }else{
  }

})(this);

