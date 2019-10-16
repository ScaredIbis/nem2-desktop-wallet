import {mapState} from 'vuex'
import {TransactionType, Password} from "nem2-sdk"
import {Component, Vue} from 'vue-property-decorator'

import {Message} from "@/config/index.ts"
import {CreateWalletType} from '@/core/model/CreateWalletType'
import trezor from '@/core/utils/trezor';
import { AppWallet } from '@/core/model/AppWallet';
import { transactionConfirmationObservable } from '@/core/services/transactions'
import { createHashLockAggregateTransaction } from '@/core/services/multisig'

@Component({
    computed: {...mapState({app: 'app', account: 'account'})}
})

export class TransactionConfirmationTs extends Vue {
    app: any;
    account: any;

    // when a user is prompted to confirm/sign a transaction
    // that workflow will subscribe to this observable and use it to control UI flow
    producer: any;

    password = '';

    get walletTypes() {
        return CreateWalletType;
    }

    get show() {
        return this.app.stagedTransaction.isAwaitingConfirmation
    }

    set show(val) {
        if (!val) {
            this.$emit('close')
            transactionConfirmationObservable.next({
                success: false,
                signedTransaction: null,
                error: 'User aborted transaction confirmation'
            });
        }
    }

    get isSelectedAccountMultisig(): boolean {
        return this.account.activeMultisigAccount ? true : false
    }

    get accountPublicKey(): string {
        return this.account.wallet.publicKey
    }

    get wallet() {
        return this.account.wallet;
    }

    get stagedTransaction() {
        return this.app.stagedTransaction.data
    }
    get otherDetails() {
        return this.app.stagedTransaction.otherDetails
    }

    get previewTransaction() {
        const { accountPublicKey, isSelectedAccountMultisig, account } = this;
        const { networkCurrency } = account;
        const { type, recipientAddress, mosaics, message, maxFee} = this.stagedTransaction;

        return {
            transaction_type: TransactionType[type].toLowerCase(),
            "Public_account": isSelectedAccountMultisig ? accountPublicKey : '(self)' + accountPublicKey,
            "transfer_target": recipientAddress.pretty(),
            "mosaic": mosaics.map(item => {
                return item.id.id.toHex() + `(${item.amount.compact()})`
            }).join(','),
            "fee": maxFee / Math.pow(10, networkCurrency.divisibility) + ' ' + networkCurrency.ticker,
            "remarks": message.payload,
        }
    }

    async confirmTransactionViaTrezor() {
        const transactionResult = await trezor.nemSignTransaction({
            path: this.wallet.path,
            transaction: this.stagedTransaction
        })

        if(transactionResult.success) {
            // get signedTransaction via TrezorConnect.nemSignTransaction
            transactionConfirmationObservable.next({
                success: true,
                signedTransaction: transactionResult.payload.signature,
                error: null
            });
        } else {
            transactionConfirmationObservable.next({
                success: false,
                signedTransaction: null,
                error: transactionResult.payload.error
            });
        }
    }

    confirmTransactionViaPassword() {
        let isPasswordValid;
        try {
            // TODO: update AppWallet.checkPassword to take a string so it can handle errors
            // when instantiating a new Password (eg. Password must be at least 8 characters)
            isPasswordValid = new AppWallet(this.wallet).checkPassword(new Password(this.password));
        } catch (e) {
            isPasswordValid = false;
        }

        if(!isPasswordValid) {
            this.$Notice.error({
                title: this.$t(Message.WRONG_PASSWORD_ERROR) + ''
            })
            return;
        }

        const account = new AppWallet(this.wallet).getAccount(new Password(this.password))
        // by default just sign the basic stagedTransaction
        let transactionToSign = this.stagedTransaction;

        // if the user is confirming an aggregate bonded transaction,
        // create a hashLocked version of stagedTransaction to be signed instead
        if (this.stagedTransaction.type === TransactionType.AGGREGATE_BONDED) {
            // bonded transaction
            transactionToSign = createHashLockAggregateTransaction(
                this.stagedTransaction,
                this.otherDetails.lockFee,
                account,
                this.$store
            )
        }

        const signedTransaction = account.sign(transactionToSign, this.account.generationHash);

        transactionConfirmationObservable.next({
            success: true,
            signedTransaction,
            error: null
        });
        this.password = '';
    }
}
