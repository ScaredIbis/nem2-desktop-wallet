import {
    MultisigCosignatoryModification,
    MultisigAccountModificationTransaction,
    CosignatoryModificationAction,
    PublicAccount,
    Deadline,
    UInt64,
    MultisigAccountInfo,
} from 'nem2-sdk'
import {mapState} from "vuex"
import {Component, Vue, Watch} from 'vue-property-decorator'
import {Message, DEFAULT_FEES, FEE_GROUPS, formDataConfig} from "@/config/index.ts"
import CheckPWDialog from '@/common/vue/check-password-dialog/CheckPasswordDialog.vue'
import {StoreAccount, DefaultFee, AppWallet, CreateWalletType} from "@/core/model"
import {getAbsoluteMosaicAmount, formatAddress} from "@/core/utils"
import {createBondedMultisigTransaction} from '@/core/services'
import {signTransaction} from '@/core/services/transactions';

@Component({
    components: {
        CheckPWDialog
    },
    computed: {
        ...mapState({
            activeAccount: 'account',
        })
    }
})
export class MultisigConversionTs extends Vue {
    activeAccount: StoreAccount
    currentAddress = ''
    isCompleteForm = false
    showCheckPWDialog = false
    transactionDetail = {}
    otherDetails = {}
    transactionList = []
    formItems = formDataConfig.multisigConversionForm
    formatAddress = formatAddress

    get wallet(): AppWallet {
        return this.activeAccount.wallet
    }

    get publicKey() {
        return this.activeAccount.wallet.publicKey
    }

    get generationHash(): string {
        return this.activeAccount.generationHash
    }

    get networkCurrency() {
        return this.activeAccount.networkCurrency
    }

    get networkType() {
        return this.activeAccount.wallet.networkType
    }

    get multisigInfo(): MultisigAccountInfo {
        const {address} = this.wallet
        return this.activeAccount.multisigAccountInfo[address]
    }

    get isMultisig(): boolean {
        if (!this.multisigInfo) return false
        return this.multisigInfo.cosignatories.length > 0
    }

    get address(): string {
        return this.activeAccount.wallet.address
    }

    get node(): string {
        return this.activeAccount.node
    }

    get defaultFees(): DefaultFee[] {
        return DEFAULT_FEES[FEE_GROUPS.TRIPLE]
    }

    get announceInLock(): boolean {
        return true
    }

    get feeAmount(): number {
        const {feeSpeed} = this.formItems
        const feeAmount = this.defaultFees.find(({speed})=>feeSpeed === speed).value
        return getAbsoluteMosaicAmount(feeAmount, this.networkCurrency.divisibility)
    }

    get feeDivider(): number {
        return 3
    }

    initForm() {
        this.formItems = formDataConfig.multisigConversionForm
    }

    addAddress() {
        const {currentAddress} = this
        if (!currentAddress || !currentAddress.trim()) {
            this.showErrorMessage(this.$t(Message.INPUT_EMPTY_ERROR) + '')
            return
        }
        this.formItems.publicKeyList.push(currentAddress)
        this.currentAddress = ''
    }

    deleteAddress(index) {
        this.formItems.publicKeyList.splice(index, 1)
    }

    confirmInput() {
        // check input data
        if (!this.isCompleteForm) return
        if (!this.checkForm()) return
        const {address} = this.wallet
        const {publicKeyList, minApproval, minRemoval} = this.formItems
        const {feeAmount} = this
        this.transactionDetail = {
            "address": address,
            "min_approval": minApproval,
            "min_removal": minRemoval,
            "cosigner": publicKeyList.join(','),
            "fee": feeAmount / Math.pow(10, this.networkCurrency.divisibility)
        }
        this.otherDetails = {
            lockFee: feeAmount
        }
        this.sendMultisigConversionTransaction()
        this.initForm()
        
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
        } = await signTransaction(this.transactionList[0], this.generationHash, this.$store);

        if(success) {
            new AppWallet(this.wallet).announceNormal(signedTransaction, this.activeAccount.node, this);
        }
    }

    showErrorMessage(message: string) {
        this.$Notice.destroy()
        this.$Notice.error({
            title: message
        })
    }

    checkForm(): boolean {
        let {publicKeyList, minApproval, minRemoval} = this.formItems
        if (publicKeyList.length < 1) {
            this.showErrorMessage(this.$t(Message.CO_SIGNER_NULL_ERROR) + '')
            return false
        }

        if ((!Number(minApproval) && Number(minApproval) !== 0) || Number(minApproval) < 1) {
            this.showErrorMessage(this.$t(Message.MIN_APPROVAL_LESS_THAN_0_ERROR) + '')
            return false
        }

        if ((!Number(minRemoval) && Number(minRemoval) !== 0) || Number(minRemoval) < 1) {
            this.showErrorMessage(this.$t(Message.MIN_REMOVAL_LESS_THAN_0_ERROR) + '')
            return false
        }

        if (Number(minApproval) > 10) {
            this.showErrorMessage(this.$t(Message.MAX_APPROVAL_MORE_THAN_10_ERROR) + '')
            return false
        }

        if (Number(minRemoval) > 10) {
            this.showErrorMessage(this.$t(Message.MAX_REMOVAL_MORE_THAN_10_ERROR) + '')
            return false
        }

        const publicKeyFlag = publicKeyList.every((item) => {
            if (item.trim().length !== 64) {
                this.showErrorMessage(this.$t(Message.ILLEGAL_PUBLIC_KEY_ERROR) + '')
                return false
            }
            return true
        })
        return publicKeyFlag
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
    }

    sendMultisigConversionTransaction() {
        // here lock fee should be relative param
        let {publicKeyList, minApproval, minRemoval} = this.formItems
        const {feeAmount, feeDivider} = this
        const bondedFee = feeAmount / feeDivider
        const innerFee = feeAmount / feeDivider
        const {networkType, publicKey} = this

        const multisigCosignatoryModificationList = publicKeyList
            .map(cosigner => new MultisigCosignatoryModification(
                CosignatoryModificationAction.Add,
                PublicAccount.createFromPublicKey(cosigner, networkType),
            ))

        const modifyMultisigAccountTransaction = MultisigAccountModificationTransaction.create(
            Deadline.create(),
            minApproval,
            minRemoval,
            multisigCosignatoryModificationList,
            networkType,
            UInt64.fromUint(innerFee)
        )

        const aggregateTransaction = createBondedMultisigTransaction(
            [modifyMultisigAccountTransaction],
            publicKey,
            networkType,
            bondedFee,
        )

        this.otherDetails = {
            lockFee: feeAmount/3
        }
        this.transactionList = [aggregateTransaction]
    }

    @Watch('formItems', {immediate: true, deep: true})
    onFormItemChange() {
        const {publicKeyList, minApproval, minRemoval} = this.formItems
        const {feeAmount} = this
        // isCompleteForm
        this.isCompleteForm = publicKeyList.length !== 0 && minApproval + '' !== '' && minRemoval + '' !== '' && feeAmount + '' !== ''
        return
    }
}
