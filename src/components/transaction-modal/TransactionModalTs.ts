import {mapState} from "vuex"
import {Component, Vue, Prop} from 'vue-property-decorator'
import {renderMosaicsAndReturnArray} from '@/core/utils'
import {
    FormattedTransaction, AppInfo, StoreAccount,
    SpecialTxDetailsKeys, TxDetailsKeysWithValueToTranslate,
} from '@/core/model'
import {getNamespaceNameFromNamespaceId} from '@/core/services'
import TransactionSummary from '@/components/transaction-summary/TransactionSummary.vue';
@Component({
    computed: {...mapState({activeAccount: 'account', app: 'app'})},
    components:{
        TransactionSummary,
    }
})
export class TransactionModalTs extends Vue {
    app: AppInfo
    activeAccount: StoreAccount
    isShowInnerDialog = false
    currentInnerTransaction = {}
    SpecialTxDetailsKeys = SpecialTxDetailsKeys
    TxDetailsKeysWithValueToTranslate = TxDetailsKeysWithValueToTranslate
    getNamespaceNameFromNamespaceId = getNamespaceNameFromNamespaceId

    @Prop({default: false}) visible: boolean
    @Prop({default: null}) activeTransaction: FormattedTransaction

    get show() {
        return this.visible
    }

    set show(val) {
        if (!val) {
            this.$emit('close')
        }
    }

    get publicKey() {
        return this.activeAccount.wallet.publicKey
    }
    get mosaics (){
        return this.activeAccount.mosaics
    }

    renderMosaicsToTable(mosaics){
        const mosaicList = renderMosaicsAndReturnArray(mosaics,this.$store)
        return {
            head:['name','amount'],
            data:mosaicList,

        }
    }
    showInnerDialog(currentInnerTransaction) {
        this.isShowInnerDialog = true
        this.currentInnerTransaction = currentInnerTransaction
    }
}
