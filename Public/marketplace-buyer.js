/*
 * ============================================================================
 *  marketplace-buyer.js  —  SISTEMA ÚNICO DE COMPRA DE ACTIVOS
 * ============================================================================
 *  UN único sistema para comprar cualquier activo de TODAS las colecciones
 *  (Bitmaps, Bittick Agents, Parcelas y las que se agreguen).
 *
 *  REGLA: ninguna pantalla implementa su propia compra. Todas delegan a este
 *  archivo pasando una `cfg` de colección + callbacks de UI (`ui`).
 *
 *  La obtención de claves (publicKey + paymentPublicKey), el armado del PSBT,
 *  la firma del comprador (Xverse / Unisat) y el broadcast son idénticos para
 *  todas las colecciones y viven aquí (una sola vez). Solo cambia:
 *    cfg.idFromItem         -> cómo obtener el id del activo desde el item
 *    cfg.buyIdsKey          -> 'bitmapIds' | 'listingIds' | 'parcelIds'
 *    cfg.transport          -> { batchBuy(payload), batchBroadcast(payload) }
 *    cfg.assetLabel         -> texto para resultados ('bitmap' | 'agente' | 'parcela')
 *    ui.*                   -> callbacks de la página
 *
 *  Variables del comprador (doc 10): activos = buyerAddress / buyerPublicKey,
 *  pago = buyerPaymentAddress / buyerPaymentPublicKey. El comprador PAGA desde
 *  la cuenta payment/saldo y RECIBE los activos en la cuenta ordinals/activos.
 *  En Xverse son 2 cuentas; en Unisat 1 sola.
 * ============================================================================
 */
var MarketplaceBuyer = (function() {

  // Obtiene buyerPublicKey; si falta, la pide en fresco y la persiste.
  var ensureBuyerPublicKey = async function(wallet) {
    if (!wallet.publicKey) {
      try {
        wallet.publicKey = await StoreApp.getPublicKeyFresh();
        if (wallet.publicKey) persistWalletField('publicKey', wallet.publicKey);
      } catch(e) { /* continúa sin publicKey */ }
    }
    return wallet.publicKey;
  };

  // Obtiene buyerPaymentPublicKey (pago/saldo). Unisat = publicKey;
  // Xverse = wallet_connect con addresses ['payment']. Luego la persiste.
  var ensureBuyerPaymentKey = async function(wallet) {
    if (!wallet.paymentPublicKey) {
      try {
        if (wallet.walletType === 'unisat') {
          wallet.paymentPublicKey = wallet.publicKey;
        } else if (wallet.walletType === 'xverse') {
          var xProvider = StoreApp._getXverseProvider();
          if (xProvider) {
            var payResp = await xProvider.request('wallet_connect', {
              addresses: ['payment'],
              message: 'BitmapCore necesita tu clave publica de pago',
              network: 'Mainnet'
            });
            var payAddrs = [];
            if (payResp && payResp.addresses) payAddrs = payResp.addresses;
            else if (payResp && payResp.result && payResp.result.addresses) payAddrs = payResp.result.addresses;
            for (var pi = 0; pi < payAddrs.length; pi++) {
              if (payAddrs[pi].purpose === 'payment' && payAddrs[pi].publicKey) {
                wallet.paymentPublicKey = payAddrs[pi].publicKey;
                break;
              }
            }
          }
        }
        if (wallet.paymentPublicKey) persistWalletField('paymentPublicKey', wallet.paymentPublicKey);
      } catch(e) { /* continúa sin paymentPublicKey */ }
    }
    return wallet.paymentPublicKey;
  };

  var persistWalletField = function(field, value) {
    try {
      var storedWallet = localStorage.getItem(StoreApp.WALLET_STORAGE_KEY);
      if (storedWallet) {
        var sw = JSON.parse(storedWallet);
        sw[field] = value;
        localStorage.setItem(StoreApp.WALLET_STORAGE_KEY, JSON.stringify(sw));
      }
    } catch(e) { /* noop */ }
  };

  // Convierte base64 a hex si el psbt no viene en hex (para firmar con Unisat).
  var toPsbtHex = function(psbt) {
    if (psbt && !/^[0-9a-fA-F]+$/.test(psbt)) {
      return Uint8Array.from(atob(psbt), function(c) { return c.charCodeAt(0); })
        .reduce(function(h, b) { return h + b.toString(16).padStart(2, '0'); }, '');
    }
    return psbt;
  };

  // Firma el PSBT de compra. El COMPRADOR firma SOLO sus inputs de pago
  // (índices items.length .. items.length+buyerInputCount). En Xverse firma con
  // la cuenta payment/saldo; en Unisat con su única cuenta.
  var signBuyPsbt = async function(psbtToSign, items, buyerInputCount, wallet) {
    if (wallet.walletType === 'xverse' && StoreApp._getXverseProvider()) {
      var buyerInputIndices = [];
      for (var bi = items.length; bi < items.length + buyerInputCount; bi++) buyerInputIndices.push(bi);
      return await StoreApp._xverseSignPsbt(psbtToSign, wallet.paymentAddress || wallet.address, buyerInputIndices);
    } else if (window.unisat && window.unisat.signPsbt) {
      var toSignInputs = [];
      for (var t = items.length; t < items.length + buyerInputCount; t++) {
        toSignInputs.push({ index: t, address: wallet.address });
      }
      return await window.unisat.signPsbt(toPsbtHex(psbtToSign), { toSignInputs: toSignInputs });
    }
    throw new Error('Wallet no disponible para firmar');
  };

  /*
   *  buy(cfg, opts, ui)
   *    cfg = {
   *      // OBLIGATORIO: items seleccionados a comprar (los que tienen listedPrice).
   *      selected: [item, ...],
   *
   *      // OBLIGATORIO: id del activo desde el item (por colección).
   *      idFromItem: function(item) -> id,
   *
   *      // OBLIGATORIO: clave del array en el payload ('bitmapIds'|'listingIds'|'parcelIds').
   *      buyIdsKey: 'bitmapIds',
   *
   *      // OBLIGATORIO: transporte de la colección.
   *      //   Bitmaps/Bittick: usar fetches a /api/v1/transaction/*-batch-buy y *-batch-broadcast
   *      //   Parcelas: ParcelMarketApi.parcelBatchBuy / parcelBatchBroadcast
   *      transport: {
   *        batchBuy: function(payload) -> Promise<json>,
   *        batchBroadcast: function(payload) -> Promise<text|json>
   *      },
   *
   *      // OPCIONAL: etiqueta singular del activo para textos ('bitmap'|'agente'|'parcela').
   *      assetLabel: 'bitmap',
   *
   *      // OPCIONAL: nombre mostrable del item para errores/resultado.
   *      nameFromItem: function(item) -> string
   *    }
   *    opts = {
   *      feeRate: number,        // sat/vB elegido por la página
   *      btcPrice: number|null,  // para mostrar en USD (opcional)
   *      idempotencyPrefix: 'batch_buy'  // prefijo de la key de idempotencia
   *    }
   *    ui = {
   *      status: function({message, type}),  // type: 'loading'|'done'|'error'
   *      onBatchBuy: function(buyJson),      // respuesta de batch-buy (para analytics/estado)
   *      onError: function(errResult),       // resultado de error (result.type === 'error')
   *      onSuccess: function(buyResult),     // resultado de éxito (result.type === 'success')
   *      onResult: function(result)          // resultado FINAL (éxito o error) — siempre se invoca
   *    }
   *
   *  Devuelve: Promise que resuelve (NUNCA rechaza) con { result, ids }.
   *  - En éxito:  result.type === 'success', con items[], totalPaid, totalFees.
   *  - En error:  result.type === 'error', con errors[] (uno por item).
   *  La página usa ui.onResult para actualizar su UI y limpiar selección/menús.
   */
  var buy = async function(cfg, opts, ui) {
    opts = opts || {};
    ui = ui || {};
    var assetLabel = cfg.assetLabel || 'activo';

    var wallet = StoreApp.get('wallet');
    if (!wallet || !wallet.address) {
      ui.onResult && ui.onResult({ type: 'error', noWallet: true, errors: [{ name: '', status: 'error', reason: 'No hay wallet conectada.' }] });
      return null;
    }

    var selected = cfg.selected || [];
    if (selected.length === 0) return null;

    var idempotencyKey = (opts.idempotencyPrefix || 'batch_buy') + '_' +
      Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
    var ids = selected.map(cfg.idFromItem);
    var feeRate = opts.feeRate;

    try {
      ui.status && ui.status({ message: 'Creando PSBT batch para ' + selected.length + ' ' + assetLabel + 's...', type: 'loading' });

      // 1) buyerPublicKey (cuenta de activos).
      if (!(await ensureBuyerPublicKey(wallet))) {
        throw new Error('No se pudo obtener la clave publica. Reconecte su wallet: vaya a Configuracion > Conectar wallet.');
      }

      // 2) buyerPaymentPublicKey (cuenta de pago/saldo).
      await ensureBuyerPaymentKey(wallet);

      // 3) Payload (variables buyer* del doc 10).
      var payload = {};
      payload[cfg.buyIdsKey] = ids;
      if (cfg.collection) payload.collection = cfg.collection;            // ENDPOINT UNIFICADO (doc 10 §3.0)
      payload.buyerAddress = wallet.address;                                // ACTIVOS (ordinals): recibe los activos
      payload.buyerPaymentAddress = wallet.paymentAddress || wallet.address; // PAGO/saldo: paga
      payload.buyerPaymentPublicKey = wallet.paymentPublicKey || wallet.publicKey;
      payload.idempotencyKey = idempotencyKey;
      payload.buyerPublicKey = wallet.publicKey;
      payload.feeRate = feeRate;

      // 4) Crear PSBT de compra en backend (puerto 3000).
      var buyJson = await cfg.transport.batchBuy(payload);
      ui.onBatchBuy && ui.onBatchBuy(buyJson);

      if (!buyJson || !buyJson.success || !buyJson.data || !buyJson.data.psbt) {
        var errMsg = buyJson && buyJson.error && buyJson.error.message ? buyJson.error.message
          : (buyJson && buyJson.error ? buyJson.error : 'Error al crear PSBT batch');
        if (typeof errMsg === 'string' && errMsg.indexOf('Saldo disponible insuficiente') !== -1) {
          throw new Error('Operacion cancelada: no tienes fondos suficientes. Recarga tu billetera y vuelve a intentar la compra.');
        }
        throw new Error(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
      }

      var psbtToSign = buyJson.data.psbt;
      var transactionId = buyJson.data.transactionId;
      var items = buyJson.data.items || [];
      var buyerInputCount = buyJson.data.buyerInputCount || 0;
      var serverMarketplaceFee = buyJson.data.marketplaceFee || 0;

      // 5) Firmar (comprador firma sus inputs de pago).
      ui.status && ui.status({ message: 'Firmando PSBT en wallet...', type: 'loading' });
      var signedPsbt;
      try {
        signedPsbt = await signBuyPsbt(psbtToSign, items, buyerInputCount, wallet);
      } catch(signErr) {
        if (wallet.walletType === 'xverse') throw new Error('Firma Xverse cancelada');
        if (window.unisat && window.unisat.signPsbt) throw new Error('Firma Unisat cancelada');
        throw signErr;
      }
      if (!signedPsbt) throw new Error('Firma cancelada');

      // 6) Broadcast.
      ui.status && ui.status({ message: 'IMPORTANTE: No cierre esta pestana hasta que se complete la transaccion. Enviando a la mempool, esperando confirmacion...', type: 'loading' });
      var broadcastRaw = await cfg.transport.batchBroadcast({ signedPsbt: signedPsbt, transactionId: transactionId });

      var broadcastJson;
      try {
        broadcastJson = (typeof broadcastRaw === 'string') ? JSON.parse(broadcastRaw) : broadcastRaw;
      } catch(parseErr) {
        // Respuesta no-JSON pero OK (el transporte de bitmaps devuelve texto).
        if (broadcastRaw && typeof broadcastRaw === 'string' && broadcastRaw.indexOf('{') === -1) {
          broadcastJson = { success: true, data: { txid: 'unknown_' + transactionId } };
        } else {
          throw new Error('Error del servidor al transmitir: ' + String(broadcastRaw).substring(0, 200));
        }
      }

      if (!broadcastJson.success || !broadcastJson.data) {
        var bErrMsg = broadcastJson.error && broadcastJson.error.message ? broadcastJson.error.message
          : (broadcastJson.error || 'Error al transmitir batch');
        throw new Error(typeof bErrMsg === 'string' ? bErrMsg : JSON.stringify(bErrMsg));
      }

      var txid = broadcastJson.data.txid || ('unknown_' + transactionId);

      // 7) Calcular totales.
      var totalPaid = items.reduce(function(sum, item) { return sum + (item.price || 0); }, 0);
      var totalFees = serverMarketplaceFee > 0 ? serverMarketplaceFee
        : Math.max(546 * items.length, Math.floor(totalPaid * 0.02));
      var successItems = items.map(function(item) {
        var name = item.name || (cfg.nameFromItem ? cfg.nameFromItem(null) : 'Activo comprado');
        return { name: name, status: 'success', txid: txid, price: item.price, fee: Math.round(totalFees / items.length) };
      });

      var buyResult = {
        type: 'success',
        items: successItems,
        errors: [],
        totalPaid: totalPaid,
        totalFees: totalFees,
        networkFees: [{ txid: txid, fee: 0 }],
        totalNetworkFee: 0,
        btcPrice: opts.btcPrice || null
      };

      ui.status && ui.status({ message: 'Compra batch exitosa: ' + successItems.length + ' ' + assetLabel + 's', type: 'done' });
      ui.onSuccess && ui.onSuccess(buyResult);
      ui.onResult && ui.onResult(buyResult);
      return { result: buyResult, ids: ids };
    } catch(e) {
      var errorItems = selected.map(function(item) {
        var name = cfg.nameFromItem ? cfg.nameFromItem(item) : (item.name || ('Activo #' + (item.inscriptionNumber || '')));
        return { name: name, status: 'error', reason: (e && e.message) || String(e) };
      });
      var errResult = {
        type: 'error',
        items: [],
        errors: errorItems,
        totalPaid: 0,
        totalFees: 0,
        networkFees: [],
        totalNetworkFee: 0,
        btcPrice: opts.btcPrice || null
      };
      ui.status && ui.status({ message: 'Error: ' + ((e && e.message) || e), type: 'error' });
      ui.onError && ui.onError(errResult);
      ui.onResult && ui.onResult(errResult);
      return { result: errResult, ids: ids };
    }
  };

  return {
    buy: buy,
    ensureBuyerPublicKey: ensureBuyerPublicKey,
    ensureBuyerPaymentKey: ensureBuyerPaymentKey
  };
})();

if (typeof window !== 'undefined') {
  window.MarketplaceBuyer = MarketplaceBuyer;
}
