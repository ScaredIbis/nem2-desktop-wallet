import {mapState} from 'vuex'
import {
    Password,
    AggregateTransaction,
    CosignatureTransaction,
    SignedTransaction,
    CosignatureSignedTransaction
} from "nem2-sdk"
import {Component, Vue} from 'vue-property-decorator'
import {transactionFormatter, transactionConfirmationObservable} from '@/core/services'
import {Message} from "@/config"
import {
    CreateWalletType, AppWallet, StagedTransaction, SignTransaction,
    AppInfo, StoreAccount, Notice, NoticeType,
} from '@/core/model'
import trezor from '@/core/utils/trezor'
import TransactionDetails from '@/components/transaction-details/TransactionDetails.vue'

@Component({
    computed: {...mapState({app: 'app', activeAccount: 'account'})},
    components: {
        TransactionDetails
    }
})

export class TransactionConfirmationTs extends Vue {
    app: AppInfo;
    activeAccount: StoreAccount;
    password = '';
    CreateWalletType = CreateWalletType

    get show() {
        return this.app.stagedTransaction.isAwaitingConfirmation
    }

    set show(val) {
        if (!val) {
            this.password = ""
            this.$emit('close')
            const result: SignTransaction = {
                success: false,
                signedTransaction: null,
                error: Message.USER_ABORTED_TX_CONFIRMATION,
            }

            transactionConfirmationObservable.next(result);
        }
    }

    get wallet() {
        return new AppWallet(this.activeAccount.wallet);
    }

    get stagedTransaction(): StagedTransaction {
        return this.app.stagedTransaction
    }

    get formattedTransaction() {
        const {transactionToSign} = this.stagedTransaction
        const [formattedTransaction] = transactionFormatter([transactionToSign], this.$store)
        return formattedTransaction
    }

    async confirmTransactionViaTrezor() {

        const {wallet} = this
        const {transactionToSign, lockParams} = this.stagedTransaction;
        const transactionJSON = this.stagedTransaction.transactionToSign.toJSON().transaction;

        /**
         * AGGREGATE BONDED
         */
        if (transactionToSign instanceof AggregateTransaction && lockParams.announceInLock) {

            const transactionResult = await trezor.nem2SignTransaction({
                path: this.wallet.path,
                transaction: transactionJSON,
                generationHash: this.app.NetworkProperties.generationHash
            })

            if (transactionResult.success) {
                const signedTransaction = new SignedTransaction(
                    transactionResult.payload.payload,
                    transactionResult.payload.hash,
                    this.wallet.publicKey,
                    transactionJSON.type,
                    this.wallet.networkType
                );

                const hashLockTransaction = wallet.getLockTransaction(
                    signedTransaction,
                    lockParams.transactionFee,
                    this.$store,
                )

                const hashLockTransactionJSON = hashLockTransaction.toJSON().transaction;

                const hashLockTransactionResult = await trezor.nem2SignTransaction({
                    path: this.wallet.path,
                    transaction: hashLockTransactionJSON,
                    generationHash: this.app.NetworkProperties.generationHash
                });

                const signedLock = new SignedTransaction(
                    hashLockTransactionResult.payload.payload,
                    hashLockTransactionResult.payload.hash,
                    this.wallet.publicKey,
                    hashLockTransactionJSON.type,
                    this.wallet.networkType
                );

                const result: SignTransaction = {
                    success: true,
                    signedTransaction,
                    signedLock,
                    error: null,
                };

                transactionConfirmationObservable.next(result);
                return;
            }
        }

        /**
         * COSIGNATURE
         */
        if (transactionToSign instanceof AggregateTransaction && transactionToSign.signer) {
            const cosignatureTransaction = CosignatureTransaction.create(transactionToSign)

            const cosignatureTransactionResult = await trezor.nem2SignTransaction({
                path: this.wallet.path,
                transaction: {
                    cosigning: cosignatureTransaction.transactionToCosign.transactionInfo.hash
                },
            });

            const signedTransaction = new CosignatureSignedTransaction(
                cosignatureTransactionResult.payload.parent_hash,
                cosignatureTransactionResult.payload.signature,
                this.wallet.publicKey
            );

            const result: SignTransaction = {
                success: true,
                signedTransaction,
                error: null,
            };

            transactionConfirmationObservable.next(result);
            return;
        }

        /**
         * DEFAULT SIGNATURE
         */

        const transactionResult = await trezor.nem2SignTransaction({
            path: this.wallet.path,
            transaction: transactionJSON,
            generationHash: this.app.NetworkProperties.generationHash
        })

        if (transactionResult.success) {
            const signedTransaction = new SignedTransaction(
                transactionResult.payload.payload,
                transactionResult.payload.hash,
                this.wallet.publicKey,
                transactionJSON.type,
                this.wallet.networkType
            );

            const result: SignTransaction = {
                success: true,
                signedTransaction,
                error: null
            }

            transactionConfirmationObservable.next(result);
        } else {
            const result: SignTransaction = {
                success: false,
                signedTransaction: null,
                error: transactionResult.payload.error
            }

            transactionConfirmationObservable.next(result);
        }
    }

    submit() {
        const {wallet, password} = this

        if (!wallet.checkPassword(password)) {
            Notice.trigger(Message.WRONG_PASSWORD_ERROR, NoticeType.error, this.$store)
            this.password = ''
            return;
        }

        const account = wallet.getAccount(new Password(this.password))
        const {transactionToSign, lockParams} = this.stagedTransaction;

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

            transactionConfirmationObservable.next(result);
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

            transactionConfirmationObservable.next(result);
            this.password = ''
            return
        }


        /**
         * DEFAULT SIGNATURE
         */
        const result: SignTransaction = {
            success: true,
            signedTransaction: account.sign(transactionToSign, this.app.NetworkProperties.generationHash),
            error: null,
        }

        this.password = ''
        transactionConfirmationObservable.next(result);
    }
}
