import {mapState} from 'vuex'
import {Component, Vue} from 'vue-property-decorator'

import { transactionConfirmationObservable } from '@/core/services/transactions'

@Component({
    computed: {...mapState({app: 'app', account: 'account'})}
})

export class TransactionConfirmationTs extends Vue {
    app: any;
    account: any;

    // when a user is prompted to confirm/sign a transaction
    // the process will be a consumer of this producer
    producer: any;

    get show() {
        return this.app.stagedTransaction.isAwaitingConfirmation
    }

    set show(val) {
        if (!val) {
            this.$emit('close')
        }
    }

    get wallet() {
        return this.account.wallet;
    }

    get stagedTransaction() {
        return this.app.stagedTransaction.data
    }

    confirmTransaction() {
        transactionConfirmationObservable.next("A SIGNED TRANSACTION");
    }
}
