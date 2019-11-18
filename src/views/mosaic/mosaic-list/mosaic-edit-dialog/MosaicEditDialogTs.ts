import {Component, Vue, Prop, Provide, Watch} from 'vue-property-decorator'
import {mapState} from "vuex"
import {
    Password, NetworkType, MosaicSupplyChangeTransaction,
    Deadline, UInt64, MosaicId, MosaicSupplyChangeAction,
} from 'nem2-sdk'
import {networkConfig, DEFAULT_FEES, FEE_GROUPS, formDataConfig} from "@/config"
import {cloneData, getAbsoluteMosaicAmount, formatNumber} from '@/core/utils'
import {AppWallet, AppMosaic, DefaultFee, StoreAccount} from "@/core/model"
import {validation} from '@/core/validation'
import DisabledForms from '@/components/disabled-forms/DisabledForms.vue'
import ErrorTooltip from '@/components/other/forms/errorTooltip/ErrorTooltip.vue'

@Component({
    computed: {
        ...mapState({activeAccount: 'account'})
    },
    components: {DisabledForms, ErrorTooltip}
})
export class MosaicEditDialogTs extends Vue {
    @Provide() validator: any = this.$validator
    activeAccount: StoreAccount
    formatNumber = formatNumber
    validation = validation
    changedSupply = 0
    totalSupply = networkConfig.maxMosaicAtomicUnits
    formItems = cloneData(formDataConfig.mosaicEditForm)

    @Prop()
    showMosaicEditDialog: boolean

    @Prop()
    itemMosaic: AppMosaic

    get show() {
        return this.showMosaicEditDialog
    }

    set show(val) {
        if (!val) {
            this.$emit('close')
        }
    }

    get supply(): number {
        return this.itemMosaic.mosaicInfo.supply.compact()
    }

    get newSupply(): number {
        const {supply} = this
        const {delta} = this.formItems
        if (!delta) return supply
        const _delta = parseInt(delta, 10)
        if (isNaN(_delta)) return supply
        console.log("TCL: MosaicEditDialogTs -> supply - delta", supply, delta, _delta)

        const newSupply = this.formItems.supplyType === MosaicSupplyChangeAction.Increase
            ? supply + _delta : supply - _delta

        return isNaN(newSupply) ? supply : newSupply
    }

    get wallet(): AppWallet {
        return this.activeAccount.wallet
    }

    get generationHash(): string {
        return this.activeAccount.generationHash
    }

    get node(): string {
        return this.activeAccount.node
    }

    get networkCurrency() {
        return this.activeAccount.networkCurrency
    }

    get mosaicId(): string {
        return this.itemMosaic.hex
    }

    get networkType(): NetworkType {
        return this.wallet.networkType
    }

    get defaultFees(): DefaultFee[] {
        return DEFAULT_FEES[FEE_GROUPS.SINGLE]
    }

    get feeAmount(): number {
        const {feeSpeed} = this.formItems
        const feeAmount = this.defaultFees.find(({speed}) => feeSpeed === speed).value
        return getAbsoluteMosaicAmount(feeAmount, this.networkCurrency.divisibility)
    }

    mosaicEditDialogCancel() {
        this.initForm()
        this.show = false
    }

    submit() {
        this.updateMosaic()
    }

    updateMosaic() {
        const {node, generationHash, feeAmount, mosaicId, networkType} = this
        const password = new Password(this.formItems.password)
        const {delta, supplyType} = this.formItems

        new AppWallet(this.wallet).signAndAnnounceNormal(
            password,
            node,
            generationHash,
            [
                MosaicSupplyChangeTransaction.create(
                    Deadline.create(),
                    new MosaicId(mosaicId),
                    supplyType,
                    UInt64.fromUint(delta),
                    networkType,
                    UInt64.fromUint(feeAmount)
                )
            ],
            this,
        )

        this.mosaicEditDialogCancel
    }

    initForm() {
        this.formItems = cloneData(formDataConfig.mosaicEditForm)
    }
    
    @Watch('newSupply')
    onSelectedMosaicHexChange() {
        /** Makes newSupply validation reactive */
        this.$validator.validate('newSupply', this.newSupply)
    }
}
