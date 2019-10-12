import {mapState} from 'vuex'
import {TransactionType, Password} from "nem2-sdk"
import {Component, Vue} from 'vue-property-decorator'

import {Message} from "@/config/index.ts"
import {CreateWalletType} from '@/core/model/CreateWalletType'
import trezor from '@/core/utils/trezor';
import { AppWallet } from '@/core/model/AppWallet';
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
        
        let preview;
        console.log(this.stagedTransaction)
        switch(this.stagedTransaction.type) {
            case TransactionType.TRANSFER:
                preview = this.previewTransfer(this.stagedTransaction, networkCurrency);
                break;
            case TransactionType.REGISTER_NAMESPACE:
                preview = this.previewCreateNamespace(this.wallet.address, this.stagedTransaction, networkCurrency);
                break;
            case TransactionType.AGGREGATE_COMPLETE:
                preview = this.previewAggregateComplete(this.wallet.address, this.stagedTransaction, networkCurrency);
                break;
            default:
                preview = {};
        }
        preview["Public_account"] = isSelectedAccountMultisig ? accountPublicKey : '(self)' + accountPublicKey;
        
        return preview;
    }

    previewTransfer(transaction, networkCurrency): any{
        const { type, recipientAddress, mosaics, message, maxFee} = transaction;
        return {
            transaction_type: TransactionType[type].toLowerCase(),            
            "transfer_target": recipientAddress.pretty(),
            "mosaic": mosaics.map(item => {
                return item.id.id.toHex() + `(${item.amount.compact()})`
            }).join(','),
            "fee": maxFee / Math.pow(10, networkCurrency.divisibility) + ' ' + networkCurrency.ticker,
            "remarks": message.payload,
        }
    }

    previewCreateNamespace(address, transaction, networkCurrency): any {
        const { type, duration, namespaceName, maxFee} = transaction;        
        return {
            transaction_type: TransactionType[type].toLowerCase(),
            "address": address,
            "fee": maxFee / Math.pow(10, networkCurrency.divisibility) + ' ' + networkCurrency.ticker,
            duration,
            namespace: namespaceName,
        }
    }

    previewAggregateComplete(address, transaction, networkCurrency) {
        let preview = {}
        transaction.innerTransactions.forEach(tx => {
            switch(tx.type) {
                case TransactionType.MOSAIC_DEFINITION:
                    Object.assign(preview, this.previewMosaicDefinition(address, tx, networkCurrency));
                    break;
                case TransactionType.MOSAIC_SUPPLY_CHANGE:
                    Object.assign(preview, this.previewMosaicSupply(tx));
            }
        });
        return preview;       
    }

    previewMosaicDefinition(address, transaction, networkCurrency): any {
        const { type, divisibility, duration, supply, maxFee, flags} = transaction;
        const permanent = duration.lower === 0 && duration.higher === 0;
        const {restrictable, supplyMutable, transferable} = flags;
        return {
            transaction_type: TransactionType[type].toLowerCase(),
            "address": address,
            "fee": maxFee / Math.pow(10, networkCurrency.divisibility) + ' ' + networkCurrency.ticker,
            "mosaic_divisibility": divisibility,
            "transmittable": !!transferable ? "Yes" : "No",
            "variable_supply": !!supplyMutable ? "Yes" : "No",
            "restrictable": !!restrictable ? "Yes" : "No",
            "duration": permanent ? "permanent" : duration,
            supply,
        }
    }

    previewMosaicSupply(transaction: any): any {
        const {delta} = transaction;
        return {
            "supply": delta.lower
        }
    }

    async confirmTransactionViaTrezor() {
        console.log("STAGED TRANSACTION", this.stagedTransaction);

        const transactionResult = await trezor.nemSignTransaction({
            path: this.wallet.path,
            transaction: this.stagedTransaction
        })

        console.log('GOT THE SIGNATURE', transactionResult)
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
            // TODO: update checkPassword to take a string so it can handle errors
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
        const signedTransaction = account.sign(this.stagedTransaction, this.account.generationHash)
        // use account to sign stagedTransaction
        transactionConfirmationObservable.next({
            success: true,
            signedTransaction,
            error: null
        });
    }
}
