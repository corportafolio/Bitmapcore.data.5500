import { Router, Request, Response } from 'express';
import * as bitcoin from 'bitcoinjs-lib';
import { parcelListingRepository } from '../repositories/ParcelListingRepository';
import { MempoolService } from '../services/MempoolService';

const NETWORK = bitcoin.networks.bitcoin;

const MARKETPLACE_FEE_RATE = 0.02;
const MIN_FEE_SATS = 546;
const DUMMY_BUYER_FEE_UTXO = '0000000000000000000000000000000000000000000000000000000000000000:0';

interface ParcelTxRecord {
  id: string;
  parcelIds: string[];
  buyerAddress: string;
  buyerPaymentAddress: string;
  status: string;
  psbt: string;
  items: Array<{ inscriptionId: string; name: string; price: number }>;
  marketplaceFee: number;
  buyerInputCount: number;
  feeRate: number;
  createdAt: number;
  txid?: string;
}

const txStore = new Map<string, ParcelTxRecord>();

export const parcelBuyRouter = Router();

function sendSuccess(res: Response, data: any, status = 200) {
  return res.status(status).json({ success: true, data, error: null });
}

function sendError(res: Response, err: any) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Error interno';
  const code = err.code || (status >= 500 ? 'INTERNAL' : 'BAD_REQUEST');
  return res.status(status).json({ success: false, data: null, error: { code, message } });
}

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function parseUtxo(utxo: string): { txid: string; vout: number } {
  const parts = utxo.split(':');
  return { txid: parts[0], vout: parseInt(parts[1], 10) };
}

function pubkeyToXOnly(pubkeyHex: string): Buffer {
  const pub = Buffer.from(pubkeyHex.replace(/^0x/i, ''), 'hex');
  return pub.length === 33 ? pub.subarray(1) : pub;
}

function hasCompleteBuyerSignature(psbt: bitcoin.Psbt, buyerInputStart: number, buyerInputCount: number): boolean {
  for (let i = buyerInputStart; i < buyerInputStart + buyerInputCount; i++) {
    const input = psbt.data.inputs[i];
    const hasSchnorr = input.tapKeySig !== undefined && input.tapKeySig !== null;
    const hasWitness = input.finalScriptWitness !== undefined && input.finalScriptWitness !== null;
    if (!hasSchnorr && !hasWitness) return false;
  }
  return true;
}

async function fetchBuyerFeeUtxos(buyerAddress: string, feeRate: number): Promise<Array<{ txid: string; vout: number; value: number }>> {
  const utxos = await MempoolService.getAddressUtxos(buyerAddress);
  return utxos
    .filter((u: any) => u.value >= MIN_FEE_SATS)
    .sort((a: any, b: any) => b.value - a.value);
}

parcelBuyRouter.post('/api/v1/transaction/parcel-batch-buy', async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const parcelIds: string[] = body.parcelIds || [];
    const buyerAddress: string = body.buyerAddress || '';
    const buyerPaymentAddress: string = body.buyerPaymentAddress || buyerAddress;
    const buyerPaymentPublicKey: string = body.buyerPaymentPublicKey || '';
    const buyerPublicKey: string = body.buyerPublicKey || buyerPaymentPublicKey;
    const idempotencyKey: string = body.idempotencyKey || '';
    const feeRate: number = parseInt(body.feeRate) || 1;

    if (parcelIds.length === 0) {
      return sendError(res, { status: 400, message: 'No hay parcelas para comprar', code: 'EMPTY_BUY' });
    }
    if (!buyerAddress) {
      return sendError(res, { status: 400, message: 'Falta direccion del comprador', code: 'MISSING_BUYER' });
    }
    if (!buyerPublicKey) {
      return sendError(res, { status: 400, message: 'Falta clave publica del comprador', code: 'MISSING_BUYER_PUBKEY' });
    }
    if (idempotencyKey && txStore.has(idempotencyKey)) {
      const existing = txStore.get(idempotencyKey)!;
      return sendSuccess(res, {
        psbt: existing.psbt,
        transactionId: existing.id,
        items: existing.items,
        buyerInputCount: existing.buyerInputCount,
        marketplaceFee: existing.marketplaceFee,
        expiresAt: existing.createdAt + 5 * 60 * 1000
      });
    }

    const listings = [];
    const items = [];
    let totalPaid = 0;
    for (const parcelId of parcelIds) {
      const listing = parcelListingRepository.findByInscriptionId(parcelId) || parcelListingRepository.findById(parcelId);
      if (!listing || listing.isActive !== 1 || listing.psbtStatus !== 'signed' || !listing.signedPsbt) {
        return sendError(res, { status: 409, message: 'La parcela ' + (listing ? listing.name : parcelId) + ' ya no esta disponible', code: 'LISTING_UNAVAILABLE' });
      }
      if (listing.sellerAddress === buyerAddress) {
        return sendError(res, { status: 409, message: 'No puedes comprar tu propia parcela ' + listing.name, code: 'SELF_BUY' });
      }
      listings.push(listing);
      items.push({ inscriptionId: listing.inscriptionId, name: listing.name, price: listing.price });
      totalPaid += listing.price;
    }

    const marketplaceFee = Math.max(MIN_FEE_SATS * listings.length, Math.floor(totalPaid * MARKETPLACE_FEE_RATE));
    const estimatedBuyerFee = Math.ceil((68 * listings.length + 109) * feeRate);
    const buyerUtxos = await fetchBuyerFeeUtxos(buyerAddress, feeRate);
    let selectedUtxos: Array<{ txid: string; vout: number; value: number }> = [];
    let sumUtxos = 0;
    for (const u of buyerUtxos) {
      selectedUtxos.push(u);
      sumUtxos += u.value;
      if (sumUtxos >= marketplaceFee + estimatedBuyerFee + MIN_FEE_SATS) break;
    }
    if (selectedUtxos.length === 0 || sumUtxos < marketplaceFee + estimatedBuyerFee + MIN_FEE_SATS) {
      return sendError(res, { status: 400, message: 'Saldo disponible insuficiente para pagar el fee de la operacion', code: 'INSUFFICIENT_FUNDS' });
    }

    const psbt = new bitcoin.Psbt({ network: NETWORK });

    for (const listing of listings) {
      const sellerPsbt = bitcoin.Psbt.fromHex(listing.signedPsbt, { network: NETWORK });
      const { txid, vout } = parseUtxo(listing.inscriptionUtxo);
      psbt.addInput({
        hash: txid,
        index: vout,
        witnessUtxo: {
          script: bitcoin.address.toOutputScript(listing.sellerPaymentAddress || listing.sellerAddress, NETWORK),
          value: BigInt(listing.inscriptionValue)
        }
      });
      if (sellerPsbt.data.inputs[0] && sellerPsbt.data.inputs[0].finalScriptWitness) {
        psbt.data.inputs[psbt.data.inputs.length - 1].finalScriptWitness = sellerPsbt.data.inputs[0].finalScriptWitness;
      } else if (sellerPsbt.data.inputs[0] && sellerPsbt.data.inputs[0].tapKeySig) {
        psbt.data.inputs[psbt.data.inputs.length - 1].tapKeySig = sellerPsbt.data.inputs[0].tapKeySig;
      }
      psbt.addOutput({
        address: listing.sellerPaymentAddress || listing.sellerAddress,
        value: BigInt(listing.price)
      });
    }

    for (const u of selectedUtxos) {
      psbt.addInput({
        hash: u.txid,
        index: u.vout,
        witnessUtxo: {
          script: bitcoin.address.toOutputScript(buyerAddress, NETWORK),
          value: BigInt(u.value)
        },
        tapInternalKey: buyerPublicKey ? pubkeyToXOnly(buyerPublicKey) : undefined
      });
    }

    psbt.addOutput({
      address: buyerPaymentAddress,
      value: BigInt(sumUtxos - marketplaceFee - estimatedBuyerFee)
    });

    const record: ParcelTxRecord = {
      id: uuid(),
      parcelIds: parcelIds.slice(),
      buyerAddress,
      buyerPaymentAddress,
      status: 'AWAITING_SIGNATURE',
      psbt: psbt.toBase64(),
      items,
      marketplaceFee,
      buyerInputCount: selectedUtxos.length,
      feeRate,
      createdAt: Date.now()
    };
    if (idempotencyKey) txStore.set(idempotencyKey, record);
    txStore.set(record.id, record);

    return sendSuccess(res, {
      psbt: record.psbt,
      transactionId: record.id,
      items,
      buyerInputCount: record.buyerInputCount,
      marketplaceFee,
      expiresAt: record.createdAt + 5 * 60 * 1000
    });
  } catch (err) {
    return sendError(res, err);
  }
});

parcelBuyRouter.post('/api/v1/transaction/parcel-batch-broadcast', async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const signedPsbt = body.signedPsbt || '';
    const transactionId = body.transactionId || '';
    if (!signedPsbt || !transactionId) {
      return sendError(res, { status: 400, message: 'Faltan datos para transmitir', code: 'MISSING_BROADCAST_DATA' });
    }

    const record = txStore.get(transactionId);
    if (!record) {
      return sendError(res, { status: 404, message: 'Transaccion no encontrada', code: 'TX_NOT_FOUND' });
    }
    if (record.status === 'SUCCESS' && record.txid) {
      return sendSuccess(res, { txid: record.txid, status: 'broadcasted' });
    }

    const psbt = bitcoin.Psbt.fromHex(signedPsbt, { network: NETWORK });

    if (!hasCompleteBuyerSignature(psbt, record.items.length, record.buyerInputCount)) {
      return sendError(res, { status: 422, message: 'La firma del comprador es invalida o incompleta', code: 'INVALID_BUYER_SIGNATURE' });
    }

    const tx = psbt.finalizeAllInputs().extractTransaction();
    const rawTxHex = tx.toHex();
    const txid = await MempoolService.broadcastTx(rawTxHex);

    record.status = 'SUCCESS';
    record.txid = txid;

    for (const item of record.items) {
      const listing = parcelListingRepository.findByInscriptionId(item.inscriptionId);
      if (listing) {
        parcelListingRepository.markSold(listing.id, txid);
        parcelListingRepository.recordSale({
          parcelId: listing.inscriptionId,
          inscriptionId: listing.inscriptionId,
          name: listing.name,
          price: listing.price,
          buyerAddress: record.buyerAddress,
          sellerAddress: listing.sellerAddress,
          txid
        });
      }
    }

    return sendSuccess(res, { txid, status: 'broadcasted' });
  } catch (err) {
    return sendError(res, err);
  }
});

export { DUMMY_BUYER_FEE_UTXO };
