import type { Fill, LedgerUpdate, LighterExplorerLog, OstiumTradeHistoryEntry, DydxFill, DydxTransfer, LighterSubAccount } from './api';
import { getHyperliquidFills, getHyperliquidLedgerUpdates, getLighterLog, getLighterSubAccounts, getOstiumTradeById, getOstiumOrderByTxHash, getDydxFills, getDydxTransfers, isDydxAddress } from './api';

export type TxResult =
  | { exchange: 'hyperliquid'; type: 'fill';     data: Fill[];              timestamp: number }
  | { exchange: 'hyperliquid'; type: 'ledger';   data: LedgerUpdate;        timestamp: number }
  | { exchange: 'lighter';     type: 'log';      data: LighterExplorerLog;  timestamp: number; accountIndexes: Set<string> }
  | { exchange: 'ostium';      type: 'trade';    data: OstiumTradeHistoryEntry; timestamp: number }
  | { exchange: 'dydx';        type: 'fill';     data: DydxFill;            timestamp: number }
  | { exchange: 'dydx';        type: 'transfer'; data: DydxTransfer;        timestamp: number };

function lighterLogTouchesAccount(log: LighterExplorerLog, accountIndexes: Set<string>, address: string) {
  const deposit = log.pubdata?.l1_deposit_pubdata_v2;
  if (deposit) {
    return accountIndexes.has(deposit.account_index) || deposit.l1_address.toLowerCase() === address.toLowerCase();
  }
  const transfer = log.pubdata?.l2_transfer_pubdata_v2;
  if (transfer) {
    return accountIndexes.has(transfer.from_account_index) || accountIndexes.has(transfer.to_account_index);
  }
  return false;
}

export async function resolveTx(address: string, hash: string): Promise<TxResult | null> {
  const isDydx = isDydxAddress(address);
  const ostiumTradeId = hash.startsWith('ostium-trade-') ? hash.slice('ostium-trade-'.length) : null;

  const [fills, ledger, lighterSubAccounts, lighterLog, ostiumTrade, ostiumOrder, dydxFills, dydxTransfers] =
    await Promise.all([
      isDydx ? Promise.resolve([]) : getHyperliquidFills(address, 2000),
      isDydx ? Promise.resolve([]) : getHyperliquidLedgerUpdates(address),
      isDydx ? Promise.resolve([]) : getLighterSubAccounts(address),
      isDydx ? Promise.resolve(null) : getLighterLog(hash),
      ostiumTradeId ? getOstiumTradeById(ostiumTradeId) : Promise.resolve(null),
      isDydx ? Promise.resolve(null) : getOstiumOrderByTxHash(hash),
      isDydx ? getDydxFills(address) : Promise.resolve([]),
      isDydx ? getDydxTransfers(address) : Promise.resolve([]),
    ]);

  // Hyperliquid fills
  const matchingFills = (fills as Fill[]).filter((f) => f.hash === hash);
  if (matchingFills.length > 0) {
    return { exchange: 'hyperliquid', type: 'fill', data: matchingFills, timestamp: matchingFills[0].time };
  }

  // Hyperliquid ledger
  const matchingLedger = (ledger as LedgerUpdate[]).find((u) => u.hash === hash);
  if (matchingLedger) {
    return { exchange: 'hyperliquid', type: 'ledger', data: matchingLedger, timestamp: matchingLedger.time };
  }

  // Lighter
  const lighterAccountIndexes = new Set((lighterSubAccounts as LighterSubAccount[]).map((s) => s.index.toString()));
  if (lighterLog && lighterLogTouchesAccount(lighterLog, lighterAccountIndexes, address)) {
    return {
      exchange: 'lighter',
      type: 'log',
      data: lighterLog,
      timestamp: new Date(lighterLog.time).getTime(),
      accountIndexes: lighterAccountIndexes,
    };
  }

  // Ostium
  const matchingOstiumEntry = ostiumOrder || ostiumTrade;
  if (matchingOstiumEntry) {
    return { exchange: 'ostium', type: 'trade', data: matchingOstiumEntry, timestamp: matchingOstiumEntry.timestamp };
  }

  // dYdX fill
  const dydxFillId = hash.startsWith('dydx-fill-') ? hash.slice('dydx-fill-'.length) : null;
  const matchingDydxFill = dydxFillId
    ? ((dydxFills as DydxFill[]).find((f) => f.id === dydxFillId) ?? null)
    : null;
  if (matchingDydxFill) {
    return { exchange: 'dydx', type: 'fill', data: matchingDydxFill, timestamp: new Date(matchingDydxFill.createdAt).getTime() };
  }

  // dYdX transfer (prefixed ID or raw tx hash)
  const dydxTransferId = hash.startsWith('dydx-transfer-') ? hash.slice('dydx-transfer-'.length) : null;
  const matchingDydxTransfer = isDydx
    ? ((dydxTransfers as DydxTransfer[]).find((t) =>
        dydxTransferId
          ? t.transactionHash === dydxTransferId || t.id === dydxTransferId
          : t.transactionHash === hash
      ) ?? null)
    : null;
  if (matchingDydxTransfer) {
    return { exchange: 'dydx', type: 'transfer', data: matchingDydxTransfer, timestamp: new Date(matchingDydxTransfer.createdAt).getTime() };
  }

  return null;
}
