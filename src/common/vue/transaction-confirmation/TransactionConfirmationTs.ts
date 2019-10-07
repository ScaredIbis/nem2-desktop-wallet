import {mapState} from 'vuex'
import {TransactionType, Password} from "nem2-sdk"
import {Component, Vue} from 'vue-property-decorator'
import {CreateWalletType} from '@/core/model/CreateWalletType'

import { transactionConfirmationObservable } from '@/core/services/transactions'

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

    confirmTransactionViaTrezor() {
        // get signedTransaction via TrezorConnect.nemSignTransaction
        transactionConfirmationObservable.next({
            success: true,
            signedTransaction: this.stagedTransaction,
            error: null
        });
    }

    confirmTransactionViaPassword() {
        // use account to sign stagedTransaction
        transactionConfirmationObservable.next({
            success: true,
            signedTransaction: this.stagedTransaction,
            error: null
        });
    }
}
