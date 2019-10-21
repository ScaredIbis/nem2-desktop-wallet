import {mapState} from "vuex"
import {Component, Vue, Watch} from 'vue-property-decorator'
import {
    MosaicId,
    MosaicNonce,
    PublicAccount,
    MosaicDefinitionTransaction,
    MosaicFlags,
    Deadline,
    UInt64,
    MosaicSupplyChangeTransaction,
    MosaicSupplyChangeAction,
    MultisigAccountInfo,
    Address,
    NetworkType, AggregateTransaction
} from 'nem2-sdk'
import {
    formatSeconds, formatAddress, getAbsoluteMosaicAmount, cloneData,
} from '@/core/utils'
import CheckPWDialog from '@/common/vue/check-password-dialog/CheckPasswordDialog.vue'
import {signTransaction} from '@/core/services/transactions';
import {formDataConfig, Message, DEFAULT_FEES, FEE_GROUPS} from '@/config'
import {StoreAccount, AppWallet, DefaultFee, CreateWalletType} from "@/core/model"
import {NETWORK_PARAMS} from '@/core/validation'
import {createBondedMultisigTransaction, createCompleteMultisigTransaction} from '@/core/services'
import MultisigBanCover from '@/components/multisig-ban-cover/MultisigBanCover.vue'

@Component({
    components: {
        CheckPWDialog,
        MultisigBanCover
    },
    computed: {
        ...mapState({
            activeAccount: 'account',
        })
    }
})
export class MosaicTransactionTs extends Vue {
    activeAccount: StoreAccount
    duration = 0
    otherDetails: any = {}
    transactionDetail = {}
    showCheckPWDialog = false
    transactionList = []
    isCompleteForm = true
    formItems = cloneData(formDataConfig.mosaicTransactionForm)
    formatAddress = formatAddress

    get wallet(): AppWallet {
        return this.activeAccount.wallet
    }

    get activeMultisigAccount(): string {
        return this.activeAccount.activeMultisigAccount
    }

    get announceInLock(): boolean {
        const {activeMultisigAccount, networkType} = this
        if (!this.activeMultisigAccount) return false
        const address = Address.createFromPublicKey(activeMultisigAccount, networkType).plain()
        return this.activeAccount.multisigAccountInfo[address].minApproval > 1
    }

    get multisigInfo(): MultisigAccountInfo {
        const {address} = this.wallet
        return this.activeAccount.multisigAccountInfo[address]
    }

    get hasMultisigAccounts(): boolean {
        if (!this.multisigInfo) return false
        return this.multisigInfo.multisigAccounts.length > 0
    }

    get multisigPublicKeyList(): { publicKey: string, address: string }[] {
        if (!this.hasMultisigAccounts) return null
        return [
            {
                publicKey: this.accountPublicKey,
                address: `(self) ${formatAddress(this.address)}`,
            },
            ...this.multisigInfo.multisigAccounts
                .map(({publicKey}) => ({
                    publicKey,
                    address: formatAddress(Address.createFromPublicKey(publicKey, this.networkType).plain())
                })),
        ]
    }

    get networkType(): NetworkType {
        return this.activeAccount.wallet.networkType
    }

    get accountPublicKey(): string {
        return this.activeAccount.wallet.publicKey
    }

    get address(): string {
        return this.activeAccount.wallet.address
    }

    get networkCurrency() {
        return this.activeAccount.networkCurrency
    }

    get node(): string {
        return this.activeAccount.node
    }

    get defaultFees(): DefaultFee[] {
        if (!this.activeMultisigAccount) return DEFAULT_FEES[FEE_GROUPS.SINGLE]
        if (!this.announceInLock) return DEFAULT_FEES[FEE_GROUPS.DOUBLE]
        if (this.announceInLock) return DEFAULT_FEES[FEE_GROUPS.TRIPLE]
    }

    get feeAmount(): number {
        const {feeSpeed} = this.formItems
        const feeAmount = this.defaultFees.find(({speed}) => feeSpeed === speed).value
        return getAbsoluteMosaicAmount(feeAmount, this.networkCurrency.divisibility)
    }

    get feeDivider(): number {
        if (!this.activeMultisigAccount) return 1
        if (!this.announceInLock) return 2
        if (this.announceInLock) return 3
    }

    get durationIntoDate(): string {
        const duration = Number(this.formItems.duration)
        if (Number.isNaN(duration)) {
            this.formItems.duration = 0
            return ''
        }
        if (duration * 12 >= 60 * 60 * 24 * 3650) {
            this.$Notice.error({
                title: this.$t(Message.DURATION_MORE_THAN_10_YEARS_ERROR) + ''
            })
            this.formItems.duration = 0
        }
        return formatSeconds(duration * 12)
    }

    initForm(): void {
        this.formItems = cloneData(formDataConfig.mosaicTransactionForm)
        this.formItems.multisigPublicKey = this.accountPublicKey
    }

    addDivisibilityAmount() {
        this.formItems.divisibility = this.formItems.divisibility >= NETWORK_PARAMS.MAX_MOSAIC_DIVISIBILITY
            ? Number(this.formItems.divisibility) : Number(this.formItems.divisibility) + 1
    }

    cutDivisibilityAmount() {
        this.formItems.divisibility = this.formItems.divisibility >= 1 ? Number(this.formItems.divisibility - 1) : Number(this.formItems.divisibility)
    }

    addSupplyAmount() {
        this.formItems.supply = this.formItems.supply >= NETWORK_PARAMS.MAX_MOSAIC_ATOMIC_UNITS
            ? Number(this.formItems.supply) : Number(this.formItems.supply) + 1
    }

    cutSupplyAmount() {
        this.formItems.supply = this.formItems.supply >= 2 ? Number(this.formItems.supply - 1) : Number(this.formItems.supply)
    }

    showCheckDialog() {
        const {supply, divisibility, transferable, permanent, supplyMutable, restrictable, duration} = this.formItems
        const {address, feeAmount, networkCurrency} = this
        this.transactionDetail = {
            "address": address,
            "supply": supply,
            "mosaic_divisibility": divisibility,
            "duration": permanent ? 'permanent' : duration,
            "fee": feeAmount / Math.pow(10, networkCurrency.divisibility),
            'transmittable': transferable,
            'variable_supply': supplyMutable,
            "restrictable": restrictable
        }

        if (this.announceInLock) {
            this.otherDetails = {
                lockFee: feeAmount / 3
            }
        }

        // create mosaic transaction
        if (this.activeMultisigAccount) {
            this.createByMultisig()            
        }
        else {
            this.createBySelf()
        }
        
        // sign and announce transaction
        switch(this.wallet.sourceType) {
            case CreateWalletType.trezor:
                this.confirmViaTransactionConfirmation()
                break;
            default:
                this.showCheckPWDialog = true
        }
    }
    async confirmViaTransactionConfirmation() {
        // delegate the signing to the TransactionConfirmation workflow
        // the resolve value of this promise will contain the signed transaction
        // if the user confirms successfullly
        const {
            success,
            signedTransaction
        } = await signTransaction({
            transaction: this.transactionList[0], 
            store: this.$store,
            otherDetails: this.otherDetails
        });

        if(success) {
            new AppWallet(this.wallet).announceNormal(signedTransaction, this.activeAccount.node, this);
        }
    }

    closeCheckPWDialog() {
        this.showCheckPWDialog = false
    }

    checkEnd(isPasswordRight) {
        if (!isPasswordRight) {
            this.showCheckPWDialog = false
            this.$Notice.destroy()
            this.$Notice.error({
                title: this.$t(Message.WRONG_PASSWORD_ERROR) + ''
            })
        }
    }

    get publicKey(): string {
        const {activeMultisigAccount, accountPublicKey} = this
        return activeMultisigAccount ? activeMultisigAccount : accountPublicKey
    }

    mosaicDefinitionAndSupplyChange(): [MosaicDefinitionTransaction, MosaicSupplyChangeTransaction] {
        let {publicKey, networkType, feeAmount, feeDivider} = this
        let {supply, divisibility, transferable, supplyMutable, duration, restrictable, permanent} = this.formItems

        const publicAccount = PublicAccount.createFromPublicKey(publicKey, networkType)
        const nonce = MosaicNonce.createRandom()
        const fee = feeAmount / feeDivider
        const mosaicId = MosaicId.createFromNonce(nonce, publicAccount)

        const mosaicDefinitionTx = MosaicDefinitionTransaction.create(
            Deadline.create(),
            nonce,
            mosaicId,
            MosaicFlags.create(supplyMutable, transferable, restrictable),
            divisibility,
            permanent ? undefined : UInt64.fromUint(duration),
            networkType,
            UInt64.fromUint(fee),
        )

        const mosaicSupplyChangeTx = MosaicSupplyChangeTransaction.create(
            Deadline.create(),
            mosaicId,
            MosaicSupplyChangeAction.Increase,
            UInt64.fromUint(supply),
            networkType,
        )

        return [mosaicDefinitionTx, mosaicSupplyChangeTx]
    }

    createBySelf() {
        const {accountPublicKey, networkType, mosaicDefinitionAndSupplyChange} = this
        const publicAccount = PublicAccount.createFromPublicKey(accountPublicKey, networkType)
        const fee = this.feeAmount / this.feeDivider

        const transactions = mosaicDefinitionAndSupplyChange()
        const [mosaicDefinitionTx] = transactions
        const [, mosaicSupplyChangeTx] = transactions

        this.transactionList = [
            AggregateTransaction.createComplete(
                Deadline.create(),
                [
                    mosaicDefinitionTx.toAggregate(publicAccount),
                    mosaicSupplyChangeTx.toAggregate(publicAccount)
                ],
                networkType,
                [],
                UInt64.fromUint(fee)
            )
        ]

        this.initForm()
    }

    createByMultisig() {
        const {networkType, feeAmount, publicKey, mosaicDefinitionAndSupplyChange} = this
        const aggregateFee = feeAmount / this.feeDivider

        if (this.announceInLock) {
            this.transactionList = [
                createBondedMultisigTransaction(
                    mosaicDefinitionAndSupplyChange(),
                    publicKey,
                    networkType,
                    aggregateFee
                )
            ]
            return
        }

        this.transactionList = [
            createCompleteMultisigTransaction(
                mosaicDefinitionAndSupplyChange(),
                publicKey,
                networkType,
                aggregateFee,
            )
        ]
    }

    checkForm() {
        const {supply, divisibility, duration} = this.formItems
        // common check
        if (!Number(supply) || supply < 0) {
            this.$Notice.error({
                title: this.$t(Message.SUPPLY_LESS_THAN_0_ERROR) + ''
            })
            return false
        }
        if ((!Number(divisibility) && Number(divisibility) !== 0) || divisibility < 0) {
            this.$Notice.error({
                title: this.$t(Message.DIVISIBILITY_LESS_THAN_0_ERROR) + ''
            })
            return false
        }
        if (!Number(duration) || duration <= 0) {
            this.$Notice.error({
                title: this.$t(Message.DURATION_LESS_THAN_0_ERROR) + ''
            })
            return false
        }
        return true
    }

    submit() {
        if (!this.isCompleteForm) return
        if (!this.checkForm()) return
        this.showCheckDialog()
    }

    @Watch('formItems.multisigPublicKey')
    onMultisigPublicKeyChange(newPublicKey, oldPublicKey) {
        if (!newPublicKey || newPublicKey === oldPublicKey) return
        this.$store.commit('SET_ACTIVE_MULTISIG_ACCOUNT', newPublicKey)
    }

    // @VEEVALIDATE
    @Watch('formItems.supply')
    onSupplyChange(newVal) {
        const {MAX_MOSAIC_ATOMIC_UNITS} = NETWORK_PARAMS
        if (newVal > MAX_MOSAIC_ATOMIC_UNITS) this.formItems.supply = MAX_MOSAIC_ATOMIC_UNITS
        if (newVal < 0) this.formItems.supply = 0
    }

    // @VEEVALIDATE
    @Watch('formItems.divisibility')
    onDivisibilityChange(newVal) {
        const {MAX_MOSAIC_DIVISIBILITY} = NETWORK_PARAMS
        if (newVal > MAX_MOSAIC_DIVISIBILITY) this.formItems.divisibility = MAX_MOSAIC_DIVISIBILITY
        if (newVal < 0) this.formItems.divisibility = 0
    }

    mounted() {
        this.formItems.multisigPublicKey = this.accountPublicKey
    }
}
