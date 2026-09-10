/*
 * ============================================================================
 *  marketplace-lister.js  —  SISTEMA ÚNICO DE LISTADO DE ACTIVOS
 * ============================================================================
 *  UN único sistema para listar (vender) cualquier activo de TODAS las
 *  colecciones (Bitmaps, Bittick Agents, Parcelas y las que se agreguen).
 *
 *  REGLA: ninguna pantalla implementa su propio listado. Todas delegan a este
 *  archivo llamando a `MarketplaceLister.list(collection, ui)`.
 *
 *  La firma de PSBT (Xverse / Unisat) y la obtención de claves son idénticas
 *  para todas las colecciones y viven aquí (una sola vez). La pantalla solo
 *  aporta:
 *    collection  -> adapter de la colección (lo que realmente cambia por colección)
 *    ui          -> callbacks de la página (menús / toasts / refresh / éxito)
 *
 *  Variables del vendedor (doc 07): activos = sellerAddress / sellerOrdinalPublicKey,
 *  pago = sellerPaymentAddress. NO confundir con las de compra (buyer*, doc 10).
 * ============================================================================
 */
var MarketplaceLister = (function() {

  var hasWallet = function() {
    var w = typeof StoreApp !== 'undefined' ? StoreApp.get('wallet') : null;
    return !!(w && w.address);
  };

  // Public key del vendedor (cuenta de activos/ordinals). Reintenta en fresco.
  var ensureSellerPubKey = async function() {
    var wallet = StoreApp.get('wallet');
    var pubKey = wallet.publicKey;
    if (!pubKey) {
      pubKey = await StoreApp.getPublicKeyFresh();
    }
    if (!pubKey) {
      throw new Error('Error: reconecta la wallet para obtener la clave publica');
    }
    return pubKey;
  };

  // Firma UN PSBT de listado. El vendedor firma el input [0] (UTXO de su
  // inscripción) desde su cuenta de ACTIVOS (ordinals). Igual en Xverse/Unisat.
  var signListingPsbt = async function(psbtHex, wallet) {
    if (!psbtHex || typeof psbtHex !== 'string') {
      throw new Error('PSBT invalido: ' + (psbtHex === null ? 'null' : typeof psbtHex));
    }
    if (wallet.walletType === 'xverse' && StoreApp._getXverseProvider()) {
      return await StoreApp._xverseSignPsbt(psbtHex, wallet.address, [0]);
    }
    if (window.unisat && window.unisat.signPsbt) {
      return await window.unisat.signPsbt(psbtHex, {
        autoFinalized: false,
        toSignInputs: [{ index: 0, address: wallet.address, sighashTypes: [0x83], useTweakedSigner: true }]
      });
    }
    throw new Error('Wallet no disponible para firmar');
  };

  var walletAvailable = function(wallet) {
    return (wallet.walletType === 'xverse' && StoreApp._getXverseProvider()) ||
           (window.unisat && window.unisat.signPsbt);
  };

  /*
   *  list(collection, ui)
   *    collection = {
   *      selected: [item, ...],           // OBLIGATORIO: items seleccionados con precio
   *      listApi: {                       // OBLIGATORIO: API de la colección
   *        create:  function(items) -> Promise<json>,          // crear listings + PSBT
   *        sign:    function(listingIds, signedPsbtHexs, pubKey) -> Promise  // activar
   *      },
   *      toBatchItem: function(item, wallet, pubKey) -> obj|null,  // mapeo al payload
   *      validate:   function(selected) -> string|null          // OPCIONAL, por colección
   *    }
   *    ui = {
   *      status:      function(msg),                 // toast/estado de progreso (string)
   *      onActivated: function(selected),            // listing activado correctamente
   *      onError:     function(errMsg),              // error mostrable
   *      onComplete:  function(activated)            // SIEMPRE al final (refresh, éxito, etc.)
   *    }
   *
   *  Devuelve: Promise que resuelve (no lanza). Comunica resultados por `ui.*`.
   */
  var list = async function(collection, ui) {
    ui = ui || {};
    var selected = collection.selected || [];
    if (selected.length === 0 || !hasWallet()) return;

    var wallet = StoreApp.get('wallet');
    var activated = false;
    var signedPsbtHexs = null;

    try {
      // 1) Validación específica de la colección (p.ej. elegibilidad de parcelas).
      if (collection.validate) {
        var invalidMsg = collection.validate(selected);
        if (invalidMsg) {
          ui.onError && ui.onError(invalidMsg);
          return;
        }
      }

      // 2) Public key del vendedor (cuenta de activos/ordinals).
      var pubKey = await ensureSellerPubKey();

      // 3) Mapear items -> batch items (adapter por colección).
      var batchItems = [];
      for (var j = 0; j < selected.length; j++) {
        var bi = collection.toBatchItem(selected[j], wallet, pubKey);
        if (bi) batchItems.push(bi);
      }
      if (batchItems.length === 0) {
        ui.onError && ui.onError('Ningun activo tiene datos UTXO validos');
        return;
      }

      // 4) Crear listings + PSBT en el backend (puerto 3000).
      ui.status && ui.status('Creando listings...');
      var createRes = await collection.listApi.create(batchItems);
      var createJson = await createRes;

      if (createJson && createJson.success && createJson.data) {
        var psbtToSigns = createJson.data.psbtToSigns || [];
        var psbtHexArray = psbtToSigns.map(function(p) { return p.unsignedPsbtHex; });

        // 5) Firmar cada PSBT (vendedor firma input [0], cuenta de activos).
        if (psbtToSigns.length === 0) {
          ui.onError && ui.onError('Error: el servidor no devolvio PSBTs para firmar');
        } else if (!walletAvailable(wallet)) {
          ui.onError && ui.onError('Wallet no disponible para firmar');
        } else {
          signedPsbtHexs = [];
          for (var i = 0; i < psbtHexArray.length; i++) {
            ui.status && ui.status('Firmando listing ' + (i + 1) + ' de ' + psbtHexArray.length + '...');
            var signedHex = await signListingPsbt(psbtHexArray[i], wallet);
            signedPsbtHexs.push(signedHex);
          }
        }

        // 6) Activar los listings firmados.
        if (signedPsbtHexs && signedPsbtHexs.length > 0) {
          var listingIds = createJson.data.listingIds || [];
          if (listingIds.length > 0) {
            ui.status && ui.status('Activando listings...');
            await collection.listApi.sign(listingIds, signedPsbtHexs, pubKey);
            activated = true;
          }
          ui.onActivated && ui.onActivated(selected);
        } else {
          ui.onError && ui.onError('Firma cancelada o fallida. Los listings permanecen inactivos.');
        }
      } else {
        ui.onError && ui.onError('Error al crear listings');
      }
    } catch(e) {
      var errMsg = 'Error: ' + ((e && e.message) || e);
      var stack = (e && e.stack) ? e.stack : '';
      ui.onError && ui.onError(errMsg, stack);
    } finally {
      ui.onComplete && ui.onComplete(activated);
    }
  };

  return {
    list: list,
    ensureSellerPubKey: ensureSellerPubKey,
    hasWallet: hasWallet
  };
})();

if (typeof window !== 'undefined') {
  window.MarketplaceLister = MarketplaceLister;
}
