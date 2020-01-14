import {mapState} from 'vuex'
import {Password, AggregateTransaction, CosignatureTransaction} from 'nem2-sdk'
import {Component, Vue} from 'vue-property-decorator'
import {transactionConfirmationObservable} from '@/core/services'
import {Message} from '@/config'
import {
  CreateWalletType, StagedTransaction, SignTransaction,
  AppInfo, StoreAccount, Notice, NoticeType, TrezorWallet,
} from '@/core/model'
import TransactionDetails from '@/components/transaction-details/TransactionDetails.vue'

@Component({
  computed: {...mapState({app: 'app', activeAccount: 'account'})},
  components: {
    TransactionDetails,
  },
})

export class TransactionConfirmationTs extends Vue {
  app: AppInfo
  activeAccount: StoreAccount
  password = ''
  CreateWalletType = CreateWalletType

  get show() {
    return this.app.stagedTransaction.isAwaitingConfirmation
  }

  set show(val) {
    if (!val) {
      this.password = ''
      this.$emit('close')
      const result: SignTransaction = {
        success: false,
        signedTransaction: null,
        error: Message.USER_ABORTED_TX_CONFIRMATION,
      }

      transactionConfirmationObservable.next(result)
    }
  }

  get wallet() {
    return this.activeAccount.wallet
  }

  get stagedTransaction(): StagedTransaction {
    return this.app.stagedTransaction
  }

  get formattedTransaction() {
    const {transactionToSign} = this.stagedTransaction
    return this.app.transactionFormatter.formatTransaction(transactionToSign)
  }

  async confirmTransactionViaTrezor() {

    const trezorWallet = new TrezorWallet(this.wallet, this.app.networkProperties.generationHash)

    const {transactionToSign, lockParams} = this.stagedTransaction

    /**
     * AGGREGATE BONDED
     */
    if (transactionToSign instanceof AggregateTransaction && lockParams.announceInLock) {

      try {
        const {
          signedLock,
          signedTransaction,
        } = await trezorWallet.signPartialWithLock(transactionToSign, lockParams.transactionFee, this.$store)

        const result = {
          success: true,
          signedTransaction,
          signedLock,
          error: null,
        }

        transactionConfirmationObservable.next(result)
      } catch (error) {
        const result = {
          success: false,
          signedTransaction: null,
          error: error.message,
        }

        transactionConfirmationObservable.next(result)
      }
    }

    /**
     * COSIGNATURE
     */
    if (transactionToSign instanceof AggregateTransaction && transactionToSign.signer) {

      try {
        const signedTransaction = await trezorWallet.cosignPartial(transactionToSign)

        const result: SignTransaction = {
          success: true,
          signedTransaction,
          error: null,
        }

        transactionConfirmationObservable.next(result)
      } catch (error) {
        const result: SignTransaction = {
          success: false,
          signedTransaction: null,
          error: error.message,
        }

        transactionConfirmationObservable.next(result)
      }
    }

    /**
     * DEFAULT SIGNATURE
     */

    try {
      const signedTransaction = await trezorWallet.sign(transactionToSign)

      const result: SignTransaction = {
        success: true,
        signedTransaction,
        error: null,
      }

      transactionConfirmationObservable.next(result)
    } catch (error) {
      const result: SignTransaction = {
        success: false,
        signedTransaction: null,
        error: error.message,
      }

      transactionConfirmationObservable.next(result)
    }
  }

  submit() {
    const {wallet, password} = this

    if (!wallet.checkPassword(password)) {
      Notice.trigger(Message.WRONG_PASSWORD_ERROR, NoticeType.error, this.$store)
      this.password = ''
      return
    }

    const account = wallet.getAccount(new Password(this.password))
    const {transactionToSign, lockParams} = this.stagedTransaction

    /**
         * AGGREGATE BONDED
         */
    if (transactionToSign instanceof AggregateTransaction && lockParams.announceInLock) {
      const {signedTransaction, signedLock} = wallet.getSignedLockAndAggregateTransaction(
        transactionToSign,
        lockParams.transactionFee,
        this.password,
        this.$store,
      )

      const result: SignTransaction = {
        success: true,
        signedTransaction,
        signedLock,
        error: null,
      }

      transactionConfirmationObservable.next(result)
      this.password = ''
      return
    }


    /**
         * COSIGNATURE
         */
    if (transactionToSign instanceof AggregateTransaction && transactionToSign.signer) {
      const cosignatureTransaction = CosignatureTransaction.create(transactionToSign)

      const result: SignTransaction = {
        success: true,
        signedTransaction: account.signCosignatureTransaction(cosignatureTransaction),
        error: null,
      }

      transactionConfirmationObservable.next(result)
      this.password = ''
      return
    }


    /**
         * DEFAULT SIGNATURE
         */
    const result: SignTransaction = {
      success: true,
      signedTransaction: account.sign(transactionToSign, this.app.networkProperties.generationHash),
      error: null,
    }

    this.password = ''
    transactionConfirmationObservable.next(result)
  }
}
