import {
    MultisigCosignatoryModification,
    MultisigAccountModificationTransaction,
    CosignatoryModificationAction,
    PublicAccount,
    Deadline,
    UInt64,
    MultisigAccountInfo,
    Address,
    NetworkHttp,
    AccountHttp,
} from 'nem2-sdk'
import {mapState} from "vuex"
import {Component, Vue, Watch, Prop, Provide} from 'vue-property-decorator'
import {Message, DEFAULT_FEES, FEE_GROUPS, formDataConfig, MULTISIG_INFO, networkConfig} from "@/config/index.ts"
import {StoreAccount, DefaultFee, AppWallet, ANNOUNCE_TYPES, MULTISIG_FORM_MODES, LockParams} from "@/core/model"
import {getAbsoluteMosaicAmount, formatAddress, cloneData} from "@/core/utils"
import {
    createBondedMultisigTransaction,
    createCompleteMultisigTransaction,
    getMultisigAccountMultisigAccountInfo,
    signTransaction,
} from '@/core/services'
import DisabledForms from '@/components/disabled-forms/DisabledForms.vue'
import CheckPWDialog from '@/components/check-password-dialog/CheckPasswordDialog.vue'
import MultisigTree from '@/views/multisig/multisig-tree/MultisigTree.vue'
import ErrorTooltip from '@/components/other/forms/errorTooltip/ErrorTooltip.vue'
import { setTimeout } from 'timers'
import { timeout, finalize } from 'rxjs/operators'

@Component({
    components: {
        CheckPWDialog,
        DisabledForms,
        MultisigTree,
        ErrorTooltip,
    },
    computed: {
        ...mapState({
            activeAccount: 'account',
        })
    }
})
export class MultisigTransactionFormTs extends Vue {
    @Provide() validator: any = this.$validator

    activeAccount: StoreAccount
    cosignerToAdd = ''
    showCheckPWDialog = false
    transactionDetail = {}
    transactionList = []
    formItems = {...this.defaultFormItems}
    MULTISIG_FORM_MODES = MULTISIG_FORM_MODES
    CosignatoryModificationAction = CosignatoryModificationAction
    Address = Address
    
    @Prop() mode: string

    treeClicked(nodeKey: any) {
        const [node] = nodeKey
        if (!node || !node.publicKey) return
        getMultisigAccountMultisigAccountInfo(node.publicKey, this.$store)
    }

    get multisigTreeData() {
        const {multisigInfo, currentAccountMultisigInfo} = this
        if (typeof (currentAccountMultisigInfo) == 'string' || !currentAccountMultisigInfo || !currentAccountMultisigInfo.multisigAccounts) return false
        const {multisigAccounts} = currentAccountMultisigInfo
        return [{
            title: MULTISIG_INFO.MULTISIG_ACCOUNTS,
            expand: true,
            children: multisigAccounts.map((item: PublicAccount) => {
                return {
                    title: item.address.pretty(),
                    children: [
                        {title: MULTISIG_INFO.PUBLIC_KEY + item.publicKey},
                        {
                            title: MULTISIG_INFO.MIN_APPROVAL + (multisigInfo[item.address.plain()] ? multisigInfo[item.address.plain()].minApproval : this.$t(Message.CLICK_TO_LOAD)),
                            publicKey: item.publicKey,
                        },
                        {
                            title: MULTISIG_INFO.MIN_REMOVAL + (multisigInfo[item.address.plain()] ? multisigInfo[item.address.plain()].minRemoval : this.$t(Message.CLICK_TO_LOAD)),
                            publicKey: item.publicKey,
                        },
                    ]
                }
            })
        }]
    }

    get cosignatoryTreeData() {
        const {multisigInfo, currentAccountMultisigInfo} = this
        if (typeof (currentAccountMultisigInfo) == 'string' || !currentAccountMultisigInfo || !currentAccountMultisigInfo.multisigAccounts) return false
        const {cosignatories} = currentAccountMultisigInfo
        return [{
            title: MULTISIG_INFO.COSIGNATORIES,
            expand: true,
            children: cosignatories.map((item: PublicAccount) => {
                return {
                    title: item.address.pretty(),
                    publicKey: item.publicKey,
                    children: [
                        {title: MULTISIG_INFO.PUBLIC_KEY + item.publicKey},
                        {
                            title: MULTISIG_INFO.MIN_APPROVAL + (multisigInfo[item.address.plain()] ? multisigInfo[item.address.plain()].minApproval : this.$t(Message.CLICK_TO_LOAD)),
                            publicKey: item.publicKey,
                        },
                        {
                            title: MULTISIG_INFO.MIN_REMOVAL + (multisigInfo[item.address.plain()] ? multisigInfo[item.address.plain()].minRemoval : this.$t(Message.CLICK_TO_LOAD)),
                            publicKey: item.publicKey,
                        },
                    ]
                }
            })
        }]
    }


    get wallet(): AppWallet {
        return this.activeAccount.wallet
    }

    get defaultFormItems() {
        return this.mode === MULTISIG_FORM_MODES.CONVERSION
            ? cloneData(formDataConfig.multisigConversionForm)
            : cloneData(formDataConfig.multisigModificationForm)
    }


    get currentAccountMultisigInfo(): MultisigAccountInfo {
        const {address} = this.wallet
        return this.activeAccount.multisigAccountInfo[address]
    }

    get multisigInfo() {
        return this.activeAccount.multisigAccountInfo
    }

    get hasMultisigAccounts(): boolean {
        if (!this.currentAccountMultisigInfo) return false
        return this.currentAccountMultisigInfo.multisigAccounts.length > 0
    }

    get multisigPublicKeyList(): { publicKey: string, address: string }[] {
        if (!this.hasMultisigAccounts) return null
        const {publicKey, address} = this.wallet

        const selfPublicKeyItem = {
            publicKey,
            address: `(self) ${formatAddress(address)}`,
        }

        const list = this.currentAccountMultisigInfo.multisigAccounts
            .map(({publicKey}) => ({
                publicKey,
                address: formatAddress(Address.createFromPublicKey(publicKey, this.networkType).plain())
            }))

        return this.hasCosignatories ? [selfPublicKeyItem, ...list] : list
    }

    get addedCosigners(): boolean {
        return this.formItems.publicKeyList
            .find(({type}) => type === CosignatoryModificationAction.Add) !== undefined
    }

    get announceType(): string {
        const {hasCosignatories, addedCosigners, formItems} = this
        if (!hasCosignatories) return ANNOUNCE_TYPES.AGGREGATE_BONDED
        if (hasCosignatories && formItems.minApproval === 1 && !addedCosigners) return ANNOUNCE_TYPES.AGGREGATE_BONDED
        return ANNOUNCE_TYPES.AGGREGATE_COMPLETE
    }

    get announceInLock(): boolean {
        return this.announceType === ANNOUNCE_TYPES.AGGREGATE_BONDED
    }

    get hasCosignatories(): boolean {
        if (!this.currentAccountMultisigInfo) return false
        return this.currentAccountMultisigInfo.cosignatories.length > 0
    }

    get publicKey() {
        return this.mode === MULTISIG_FORM_MODES.CONVERSION
            ? this.activeAccount.wallet.publicKey
            : this.formItems.multisigPublicKey
    }

    get networkCurrency() {
        return this.activeAccount.networkCurrency
    }

    get networkType() {
        return this.activeAccount.wallet.networkType
    }

    get address(): string {
        return this.activeAccount.wallet.address
    }

    get defaultFees(): DefaultFee[] {
        return this.announceInLock ? DEFAULT_FEES[FEE_GROUPS.TRIPLE] : DEFAULT_FEES[FEE_GROUPS.DOUBLE]
    }

    get feeDivider(): number {
        return this.announceInLock ? 3 : 2
    }

    get feeAmount(): number {
        const {feeSpeed} = this.formItems
        const feeAmount = this.defaultFees.find(({speed}) => feeSpeed === speed).value
        return getAbsoluteMosaicAmount(feeAmount, this.networkCurrency.divisibility)
    }

    get displayForm(): boolean {
        const {mode, hasMultisigAccounts, hasCosignatories} = this
        if (hasCosignatories) return false
        if (mode === MULTISIG_FORM_MODES.MODIFICATION && !hasMultisigAccounts) return false
        return true
    }

    get formHeadline(): string {
        const {mode, hasMultisigAccounts, hasCosignatories} = this
        if (hasCosignatories) return 'this_account_is_already_converted'
        if (mode === MULTISIG_FORM_MODES.MODIFICATION && !hasMultisigAccounts) return 'this_account_is_not_a_cosignatory'
        if (mode === MULTISIG_FORM_MODES.CONVERSION) return 'Convert_to_multi_sign_account'
        if (mode === MULTISIG_FORM_MODES.MODIFICATION) return 'Edit_co_signers_and_signature_thresholds'
    }

    get initialPublicKey(): string {
        if (this.mode === MULTISIG_FORM_MODES.CONVERSION) return ''
        const {activeMultisigAccount} = this.activeAccount
        return activeMultisigAccount
            ? activeMultisigAccount
            : this.multisigPublicKeyList && this.multisigPublicKeyList[0].publicKey || ''
    }

    initForm() {
        this.formItems = {...this.defaultFormItems}
        this.formItems.multisigPublicKey = this.initialPublicKey
    }

    addModification(publicAccount: PublicAccount, modificationAction: number): void {
        try {
            const modificationToAdd = new MultisigCosignatoryModification(
                modificationAction,
                publicAccount,
            )
            this.formItems.publicKeyList.push(modificationToAdd)
        } catch (error) {
            console.error("addModification: error", error)
        }

        
            // if (this.formItems.publicKeyList
            //     .findIndex(({publicAccount}) => publicAccount.publicKey === publicAccount.publicKey) > -1) {
            //     this.cosignerToAdd = ''
            //     return
            // }

    }

    async addCosigner(modificationAction: number) {
        if(this.$validator.errors.has('cosigner')) return

        const {cosignerToAdd, networkType} = this

        
        if (this.cosignerToAdd.length === networkConfig.PUBLIC_KEY_LENGTH) {
            this.addModification(
                PublicAccount.createFromPublicKey(cosignerToAdd, networkType),
                modificationAction,
            )
            this.cosignerToAdd = ''
            return
        }
        
        try {
            console.log("TCL: addCosigner -> address", this.cosignerToAdd)
            const address = Address.createFromRawAddress(this.cosignerToAdd)
            this.$store.commit('SET_LOADING_OVERLAY', {
                show: true,
                message:  `resolving address ${address.pretty()}...` 
            })

            const accountInfoPromise = new AccountHttp(this.activeAccount.node)
                .getAccountInfo(address)
                .pipe(
                    timeout(6000),
                    finalize(() => {
                        this.$store.commit('SET_LOADING_OVERLAY', {
                            show: false,
                            message:  '' 
                        })
                    }))
                .subscribe(
                    (accountInfo) => {
                        this.addModification(accountInfo.publicAccount, modificationAction)
                    },
                    (error) => {
                        this.showErrorMessage(`${this.$t(Message.ADDRESS_FORMAT_ERROR)}`)
                        console.log("TCL: addCosigner -> error", error)
                    })
        } catch(error) {
            console.log("MultisigTransactionForm: getAccountInfo -> error", error)
            this.$store.commit('SET_LOADING_OVERLAY', { show: false, message:  '' })
        }
    }

    removeCosigner(index) {
        this.formItems.publicKeyList.splice(index, 1)
    }

    submit() {
        if (!this.checkForm()) return
        const {hasCosignatories} = this

        if (!hasCosignatories) this.sendMultisigConversionTransaction()
        if (hasCosignatories) this.sendMultisigModificationTransaction()
        this.initForm()
        this.confirmViaTransactionConfirmation()
    }

    get lockParams(): LockParams {
        const {announceInLock, feeAmount, feeDivider} = this
        return new LockParams(announceInLock, feeAmount / feeDivider)
    }

    async confirmViaTransactionConfirmation() {
        console.log(this.transactionList[0],'this.transactionList[0]')
        const {
            success,
            signedTransaction,
            signedLock,
        } = await signTransaction({
            transaction: this.transactionList[0],
            store: this.$store,
            lockParams: this.lockParams,
        })
        if (success) {
            new AppWallet(this.wallet).announceTransaction(signedTransaction, this.activeAccount.node, this, signedLock)
            this.initForm()
        }
    }

    showErrorMessage(message: string) {
        this.$Notice.destroy()
        this.$Notice.error({
            title: message
        })
    }

    checkForm(): boolean {
        const {publicKeyList, minApproval, minRemoval} = this.formItems
        const newMinApproval = Number(minApproval)
        const newMinRemoval = Number(minRemoval)

        if (this.mode === MULTISIG_FORM_MODES.CONVERSION) {
            if (publicKeyList.length < 1) {
                this.showErrorMessage(this.$t(Message.CO_SIGNER_NULL_ERROR) + '')
                return false
            }

            if ((!newMinApproval && newMinApproval !== 0) || newMinApproval < 1) {
                this.showErrorMessage(this.$t(Message.MIN_APPROVAL_LESS_THAN_0_ERROR) + '')
                return false
            }

            if ((!newMinRemoval && newMinRemoval !== 0) || newMinRemoval < 1) {
                this.showErrorMessage(this.$t(Message.MIN_REMOVAL_LESS_THAN_0_ERROR) + '')
                return false
            }
        }

        if (newMinApproval > 10) {
            this.showErrorMessage(this.$t(Message.MAX_APPROVAL_MORE_THAN_10_ERROR) + '')
            return false
        }

        if (newMinRemoval > 10) {
            this.showErrorMessage(this.$t(Message.MAX_REMOVAL_MORE_THAN_10_ERROR) + '')
            return false
        }

        return true
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


    sendMultisigConversionTransaction(): void {
        const {minApproval, minRemoval, publicKeyList} = this.formItems
        const {feeAmount, feeDivider, networkType, publicKey} = this

        const modifyMultisigAccountTransaction = MultisigAccountModificationTransaction.create(
            Deadline.create(),
            minApproval,
            minRemoval,
            publicKeyList,
            networkType,
            UInt64.fromUint(feeAmount / feeDivider)
        )

        this.transactionList = [createBondedMultisigTransaction(
            [modifyMultisigAccountTransaction],
            publicKey,
            networkType,
            feeAmount / feeDivider,
        )]
    }

    sendMultisigModificationTransaction(): void {
        const {announceType} = this

        if (announceType === ANNOUNCE_TYPES.AGGREGATE_BONDED) {
            this.createBondedModifyTransaction()
            return
        }

        this.createCompleteModifyTransaction()
    }

    get multisigAccountModificationTransaction() {
        const {networkType, feeAmount, feeDivider} = this
        const {minApproval, minRemoval, publicKeyList} = this.formItems

        return MultisigAccountModificationTransaction.create(
            Deadline.create(),
            Number(minApproval),
            Number(minRemoval),
            publicKeyList,
            networkType,
            UInt64.fromUint(feeAmount / feeDivider)
        )
    }

    createBondedModifyTransaction() {
        const {networkType, publicKey, feeAmount, feeDivider, multisigAccountModificationTransaction} = this

        this.transactionList = [createBondedMultisigTransaction(
            [multisigAccountModificationTransaction],
            publicKey,
            networkType,
            feeAmount / feeDivider
        )]
    }

    createCompleteModifyTransaction() {
        const {networkType, feeAmount, feeDivider, multisigAccountModificationTransaction, publicKey} = this

        this.transactionList = [createCompleteMultisigTransaction(
            [multisigAccountModificationTransaction],
            publicKey,
            networkType,
            feeAmount / feeDivider,
        )]
    }

    @Watch('formItems', {immediate: true, deep: true})
    onFormItemChange(newVal, oldVal) {
        // if (MULTISIG_FORM_MODES.CONVERSION) {
        //     this.isCompleteForm = publicKeyList.length !== 0 && newMinApproval + '' !== '' && newMinRemoval + '' !== '' && feeAmount + '' !== ''
        // }

        // if (MULTISIG_FORM_MODES.MODIFICATION) {
        //     this.isCompleteForm = publicKeyList.length !== 0 || newMinApproval !== 0 || newMinRemoval !== 0
        // }

        if (MULTISIG_FORM_MODES.MODIFICATION) {
            if (!newVal.multisigPublicKey || newVal.multisigPublicKey === oldVal.multisigPublicKey) return
            this.$store.commit('SET_ACTIVE_MULTISIG_ACCOUNT', newVal.multisigPublicKey)
        }
    }

    mounted() {
        this.initForm()
    }
}
