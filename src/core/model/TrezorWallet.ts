import {
  AggregateTransaction,
  SignedTransaction,
  Transaction,
  CosignatureTransaction,
  CosignatureSignedTransaction,
} from 'nem2-sdk'
import { HardwareWallet } from './HardwareWallet'
import trezor from '../utils/trezor'
import { AppState } from './types'
import { Store } from 'vuex'

export class TrezorWallet extends HardwareWallet {

  /**
   * delegates signing to the trezor device and returns a SignedTransaction instance
   *
   * @param {Transaction} transaction
   * @returns {SignedTransaction} signed transaction instance
   */
  async sign(transaction: Transaction) {

    const transactionJSON = transaction.toJSON().transaction

    const result = await trezor.nem2SignTransaction({
      transaction: transactionJSON,
      path: this.appWallet.path,
      generationHash: this.generationHash,
    })

    if(!result.success) {
      throw new Error(result.payload.error)
    }

    return new SignedTransaction(
      result.payload.payload,
      result.payload.hash,
      this.appWallet.publicKey,
      transactionJSON.type,
      this.appWallet.networkType,
    )
  }

  /**
   * delegates signing to the trezor device and returns an object containing the signed transaction and signed lock
   *
   * @param {AggregateTransaction} aggregate
   * @param {number | undefined} transactionFee
   * @param {Store<AppState>} store
   *
   * @return {{ signedLock: SignedTransaction, signedTransaction: SignedTransaction }}
   *
   */
  async signPartialWithLock(
    aggregate: AggregateTransaction,
    transactionFee: number | undefined,
    store: Store<AppState>,
  ) {
    const transactionJSON = aggregate.toJSON().transaction

    const result = await trezor.nem2SignTransaction({
      transaction: transactionJSON,
      path: this.appWallet.path,
      generationHash: this.generationHash,
    })

    if(!result.success) {
      throw new Error(result.payload.error)
    }

    const signedTransaction = new SignedTransaction(
      result.payload.payload,
      result.payload.hash,
      this.appWallet.publicKey,
      transactionJSON.type,
      this.appWallet.networkType,
    )

    const hashLockTransaction = this.appWallet.getLockTransaction(
      signedTransaction,
      transactionFee,
      store,
    )

    const hashLockTransactionJSON = hashLockTransaction.toJSON().transaction

    const hashLockResult = await trezor.nem2SignTransaction({
      transaction: hashLockTransactionJSON,
      path: this.appWallet.path,
      generationHash: this.generationHash,
    })

    const signedLock = new SignedTransaction(
      hashLockResult.payload.payload,
      hashLockResult.payload.hash,
      this.appWallet.publicKey,
      hashLockTransactionJSON.type,
      this.appWallet.networkType,
    )

    return {
      signedLock,
      signedTransaction,
    }
  }

  /**
   * delegates signing to trezor device and returns a CosignatureSignedTransaction instance
   *
   * @param {AggregateTransaction} aggregate
   * @returns {CosignatureSignedTransaction}
   */
  async cosignPartial(aggregate: AggregateTransaction) {
    const cosignatureTransaction = CosignatureTransaction.create(aggregate)

    const result = await trezor.nem2SignTransaction({
      path: this.appWallet.path,
      transaction: {
        cosigning: cosignatureTransaction.transactionToCosign.transactionInfo.hash,
      },
    })

    if(!result.success) {
      throw new Error(result.payload.error)
    }

    return new CosignatureSignedTransaction(
      result.payload.parent_hash,
      result.payload.signature,
      this.appWallet.publicKey,
    )
  }
}
