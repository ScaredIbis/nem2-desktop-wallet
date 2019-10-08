import {
  Mosaic, MosaicId, UInt64, Address, NamespaceId,
  MultisigAccountInfo, TransferTransaction,
  Message as Msg,
  Deadline,
  PlainMessage} from 'nem2-sdk'
import {mapState} from "vuex"
import {Message, DEFAULT_FEES, FEE_GROUPS, formDataConfig} from "@/config"
import {Component, Provide, Vue, Watch} from 'vue-property-decorator'
import CheckPWDialog from '@/common/vue/check-password-dialog/CheckPasswordDialog.vue'
import {getAbsoluteMosaicAmount, getRelativeMosaicAmount, formatAddress} from "@/core/utils"
import {standardFields, isAddress} from "@/core/validation"
import {CreateWalletType} from '@/core/model/CreateWalletType'
import {signTransaction} from '@/core/services/transactions';
import {AppMosaic, AppWallet, AppInfo, StoreAccount, DefaultFee} from "@/core/model"
import {createBondedMultisigTransaction, createCompleteMultisigTransaction} from '@/core/services'
import ErrorTooltip from '@/views/other/forms/errorTooltip/ErrorTooltip.vue'

@Component({
    components: {
        CheckPWDialog,
        ErrorTooltip
    },
    computed: {
        ...mapState({
            activeAccount: 'account',
            app: 'app'
        })
    },
})
export class TransactionFormTs extends Vue {
    @Provide() validator: any = this.$validator
    activeAccount: StoreAccount
    app: AppInfo
    isShowPanel = true
    transactionList = []
    transactionDetail = {}
    isShowSubAlias = false
    showCheckPWDialog = false
    otherDetails: any = {}
    isCompleteForm = true
    currentCosignatoryList = []
    currentMosaic: string = ''
    currentAmount: number = 0
    isAddressMapNull = true
    formItems = formDataConfig.transferForm
    standardFields: object = standardFields
    getRelativeMosaicAmount = getRelativeMosaicAmount
    formatAddress = formatAddress

    get addressAliasMap() {
        const addressAliasMap = this.activeAccount.addressAliasMap
        for (let item in addressAliasMap) {
            this.isAddressMapNull = false
            return addressAliasMap
        }
        this.isAddressMapNull = true
        return addressAliasMap
    }

    get announceInLock(): boolean {
        const {activeMultisigAccount, networkType} = this
        if (!this.activeMultisigAccount) return false
        const address = Address.createFromPublicKey(activeMultisigAccount, networkType).plain()
        // @TODO: Do a loading system
        const multisigInfo = this.activeAccount.multisigAccountInfo[address]
        if (!multisigInfo) return false
        return multisigInfo.minApproval > 1
    }

    get defaultFees(): DefaultFee[] {
        if (!this.activeMultisigAccount) return DEFAULT_FEES[FEE_GROUPS.SINGLE]
        if (!this.announceInLock) return DEFAULT_FEES[FEE_GROUPS.DOUBLE]
        if (this.announceInLock) return DEFAULT_FEES[FEE_GROUPS.TRIPLE]
    }

    get networkCurrency() {
        return this.activeAccount.networkCurrency
    }

    get feeAmount(): number {
        const {feeSpeed} = this.formItems
        const feeAmount = this.defaultFees.find(({speed})=>feeSpeed === speed).value
        return getAbsoluteMosaicAmount(feeAmount, this.networkCurrency.divisibility)
    }

    get feeDivider(): number {
        if (!this.activeMultisigAccount) return 1
        if (!this.announceInLock) return 2
        if (this.announceInLock) return 3
    }

    get isSelectedAccountMultisig(): boolean {
        return this.activeAccount.activeMultisigAccount ? true : false
    }

    get activeMultisigAccount(): string {
        return this.activeAccount.activeMultisigAccount
    }

    get activeMultisigAccountAddress(): string {
      const {activeMultisigAccount} = this
      return activeMultisigAccount
          ? Address.createFromPublicKey(activeMultisigAccount, this.wallet.networkType).plain()
          : null
    }

    get address(): string {
        return this.activeAccount.wallet.address
    }

    get multisigMosaicList(): Record<string, AppMosaic> {
        const {activeMultisigAccountAddress} = this
        const {multisigAccountsMosaics} = this.activeAccount
        if (!activeMultisigAccountAddress) return {}
        return multisigAccountsMosaics[activeMultisigAccountAddress] || {}
    }

    get multisigInfo(): MultisigAccountInfo {
        const {address} = this.wallet
        return this.activeAccount.multisigAccountInfo[address]
    }

    get hasMultisigAccounts(): boolean {
        if (!this.multisigInfo) return false
        return this.multisigInfo.multisigAccounts.length > 0
    }

    get multisigPublicKeyList(): {publicKey: string, address: string}[] {
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

    get generationHash() {
        return this.activeAccount.generationHash
    }

    get accountAddress() {
        return this.activeAccount.wallet.address
    }

    get accountPublicKey(): string {
        return this.activeAccount.wallet.publicKey
    }

    get wallet(): AppWallet {
        return this.activeAccount.wallet
    }

    get node() {
        return this.activeAccount.node
    }

    get networkType() {
        return this.activeAccount.wallet.networkType
    }

    get mosaicsLoading() {
        return this.app.mosaicsLoading
    }

    get mosaics() {
        const {mosaicsLoading} = this
        return mosaicsLoading ? [] : this.activeAccount.mosaics
    }

    get currentHeight() {
        return this.app.chainStatus.currentHeight
    }

    get recipient(): Address | NamespaceId {
        const {recipient} = this.formItems
        if (isAddress(this.formItems.recipient)) return Address.createFromRawAddress(recipient)
        return new NamespaceId(recipient)
    }

    get mosaicList() {
        // @TODO: would be better to return a loading indicator
        // instead of an empty array ([] = "no matching data" in the select dropdown)
        const {mosaics, currentHeight, multisigMosaicList, isSelectedAccountMultisig} = this
        const mosaicMap = isSelectedAccountMultisig ? multisigMosaicList : mosaics
        const mosaicList: any = Object.values(mosaicMap)
        // @TODO: refactor, make it an AppMosaic method
        return [...mosaicList]
            .filter(mosaic => mosaic.balance && mosaic.balance > 0
                && (mosaic.expirationHeight === 'Forever'
                    || currentHeight < mosaic.expirationHeight))
            .map(({name, balance, hex}) => ({
                label: `${name || hex} (${balance.toLocaleString()})`,
                value: hex,
            }))
    }

    initForm() {
        this.formItems = formDataConfig.transferForm
        this.formItems.multisigPublicKey = this.accountPublicKey
        this.resetFields()
    }

    addMosaic() {
        const {currentMosaic, mosaics, currentAmount} = this
        const {divisibility} = mosaics[currentMosaic].properties
        const mosaicTransferList = [...this.formItems.mosaicTransferList]
        const that = this
        let resultAmount = currentAmount
        mosaicTransferList.every((item, index) => {
                if (item.id.toHex() == currentMosaic) {
                    resultAmount = Number(getRelativeMosaicAmount(item.amount.compact(), divisibility)) + Number(resultAmount)
                    that.formItems.mosaicTransferList.splice(index, 1)
                    return false
                }
                return true
            }
        )
        this.formItems.mosaicTransferList.unshift(
            new Mosaic(
                new MosaicId(currentMosaic),
                UInt64.fromUint(
                    getAbsoluteMosaicAmount(resultAmount, divisibility)
                )
            )
        )
    }

    removeMosaic(index) {
        this.formItems.mosaicTransferList.splice(index, 1)
    }

    async submit() {
        if (!this.checkForm()) return

        this.$validator
            .validate()
            .then((valid) => {
                if (!valid) return
                this.showDialog();
            })
    }

    showDialog() {
        const {accountPublicKey, isSelectedAccountMultisig, feeAmount} = this
        const {remark, mosaicTransferList, recipient} = this.formItems
        const publicKey = isSelectedAccountMultisig ? accountPublicKey : '(self)' + accountPublicKey

        this.transactionDetail = {
            "transaction_type": isSelectedAccountMultisig ? 'Multisig_transfer' : 'ordinary_transfer',
            "Public_account": publicKey,
            "transfer_target": recipient,
            "mosaic": mosaicTransferList.map(item => {
                return item.id.id.toHex() + `(${item.amount.compact()})`
            }).join(','),
            "fee": feeAmount / Math.pow(10, this.networkCurrency.divisibility) + ' ' + this.networkCurrency.ticker,
            "remarks": remark,
        }

        if (this.announceInLock) {
            this.otherDetails = {
                lockFee: feeAmount / 3
            }
        }

        // TODO: reuse TransactionConfirmation for transactions on all wallets
        switch(this.wallet.sourceType) {
            case CreateWalletType.trezor:
                this.confirmViaTransactionConfirmation()
                break;
            default:
                this.confirmViaTransactionConfirmation()
                // this.confirmViaCheckPasswordDialog()
        }
    }

    async confirmViaTransactionConfirmation() {
        if (this.activeMultisigAccount) {
            this.sendMultisigTransaction()
        } else {
            this.sendTransaction()
        }

        // delegate the signing to the TransactionConfirmation workflow
        // the resolve value of this promise will contain the signed transaction
        // if the user confirms successfullly
        const {
            success,
            signedTransaction
        } = await signTransaction(this.transactionList[0], this.generationHash, this.$store);

        if(success) {
            new AppWallet(this.wallet).announceNormal(signedTransaction, this.activeAccount.node, this);
        }
    }

    confirmViaCheckPasswordDialog() {
        if (this.activeMultisigAccount) {
            this.sendMultisigTransaction()
            this.showCheckPWDialog = true
            return
        }

        this.sendTransaction()
        this.showCheckPWDialog = true
    }

    sendTransaction() {
        const {remark, mosaicTransferList} = this.formItems
        const {feeAmount, networkType, recipient} = this
        const message: Msg = PlainMessage.create(remark)
        const transaction = TransferTransaction
            .create(  Deadline.create(),
                      recipient,
                      mosaicTransferList,
                      message,
                      networkType,
                      UInt64.fromUint(feeAmount))
        this.transactionList = [transaction]
    }

    sendMultisigTransaction() {
        const {networkType, feeAmount, recipient, feeDivider} = this
        let {mosaicTransferList, remark, multisigPublicKey} = this.formItems
        const message: Msg = PlainMessage.create(remark)
        const innerFee = feeAmount / feeDivider
        const aggregateFee = feeAmount / feeDivider

        const transaction = TransferTransaction
            .create(  Deadline.create(),
                      recipient,
                      mosaicTransferList,
                      message,
                      networkType,
                      UInt64.fromUint(feeAmount))

        if (this.announceInLock) {
            const aggregateTransaction = createBondedMultisigTransaction(
                [transaction],
                multisigPublicKey,
                networkType,
                innerFee
            )
            this.transactionList = [aggregateTransaction]
            return
        }
        const aggregateTransaction = createCompleteMultisigTransaction(
            [transaction],
            multisigPublicKey,
            networkType,
            aggregateFee
        )
        this.transactionList = [aggregateTransaction]
    }

    async checkForm() {
        const {recipient, mosaicTransferList, multisigPublicKey} = this.formItems

        // multisig check
        if (multisigPublicKey.length < 64) {
            this.showErrorMessage(this.$t(Message.ILLEGAL_PUBLIC_KEY_ERROR))
            return false
        }
        if (!recipient) {
            this.showErrorMessage(this.$t(Message.ADDRESS_FORMAT_ERROR))
            return false
        }
        if (mosaicTransferList.length < 1) {
            this.showErrorMessage(this.$t(Message.MOSAIC_LIST_NULL_ERROR))
            return false
        }
        return true
    }

    showErrorMessage(message) {
        this.$Notice.destroy()
        this.$Notice.error({
            title: message
        })
    }

    closeCheckPWDialog() {
        this.showCheckPWDialog = false
    }

    checkEnd(isPasswordRight) {
        if (!isPasswordRight) {
            this.$Notice.destroy()
            this.$Notice.error({
                title: this.$t(Message.WRONG_PASSWORD_ERROR) + ''
            })
        }
        this.initForm()
    }


    @Watch('formItems.multisigPublicKey')
    onMultisigPublicKeyChange(newPublicKey, oldPublicKey) {
        if (!newPublicKey || newPublicKey === oldPublicKey) return
        this.$store.commit('SET_ACTIVE_MULTISIG_ACCOUNT', newPublicKey)
    }

    // @TODO: probably not the best way
    @Watch('wallet', {deep: true})
    onWalletChange(newVal, oldVal) {
        if (!newVal.publicKey) return
        const multisigPublicKey = newVal.publicKey
        if (multisigPublicKey !== oldVal.publicKey) {
            this.initForm()
        }
    }

    resetFields() {
        this.$nextTick(() => this.$validator.reset())
    }

    // @TODO: set this function at a higher level and put the multisig wallet list in the store
    async mounted() {
        this.initForm()
    }
}
