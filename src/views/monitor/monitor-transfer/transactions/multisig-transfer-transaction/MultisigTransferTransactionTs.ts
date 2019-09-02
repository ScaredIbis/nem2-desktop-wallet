import {Message, formData} from "@/config/index.ts"
import {MultisigApiRxjs} from '@/core/api/MultisigApiRxjs.ts'
import {Component, Vue, Watch} from 'vue-property-decorator'
import CheckPWDialog from '@/common/vue/check-password-dialog/CheckPasswordDialog.vue'
import {
    Mosaic,
    MosaicId,
    UInt64,
    Address,
    Listener,
} from 'nem2-sdk'
import {
    createBondedMultisigTransaction,
    createCompleteMultisigTransaction,
    getMosaicList,
    buildMosaicList
} from "@/core/utils/wallet.ts"
import {TransactionApiRxjs} from "@/core/api/TransactionApiRxjs"
import {MessageType} from "nem2-sdk/dist/src/model/transaction/MessageType"
import {mapState} from "vuex"

@Component({
    components: {
        CheckPWDialog,
    },
    computed: {...mapState({activeAccount: 'account'})},
})
export class MultisigTransferTransactionTs extends Vue {
    activeAccount: any
    isShowPanel = true
    transactionList = []
    transactionDetail = {}
    currentMinApproval = 0
    isShowSubAlias = true
    showCheckPWDialog = false
    otherDetails: any = {}
    isCompleteForm = true
    currentCosignatoryList = []
    currentMosaic: string = ''
    currentAmount: number = 0
    mosaicList = []
    multisigPublickeyList: any = []
    isAddressMapNull = true
    formItem = formData.multisigTransferForm

    get addresAliasMap() {
        const addresAliasMap = this.activeAccount.addresAliasMap
        for (let item in addresAliasMap) {
            this.isAddressMapNull = false
            return addresAliasMap
        }
        this.isAddressMapNull = true
        return addresAliasMap
    }

    get generationHash() {
        return this.activeAccount.generationHash
    }


    get currentXem() {
        return this.activeAccount.currentXem
    }


    get accountAddress() {
        return this.activeAccount.wallet.address
    }

    get currentXEM1() {
        return this.activeAccount.currentXEM1
    }

    get currentXEM2() {
        return this.activeAccount.currentXEM2
    }

    get getWallet() {
        return this.activeAccount.wallet
    }

    get node() {
        return this.activeAccount.node
    }

    get networkType() {
        return this.activeAccount.wallet.networkType
    }

    initForm() {
        this.formItem = {
            address: '',
            mosaicTransferList: [],
            remark: '',
            multisigPublickey: '',
            innerFee: 10000000,
            lockFee: 10000000,
            isEncryption: true,
            aggregateFee: 10000000,
        }
    }


    addMosaic() {
        const {currentMosaic, currentAmount} = this
        this.formItem.mosaicTransferList.push(new Mosaic(new MosaicId(currentMosaic), UInt64.fromUint(currentAmount)))
    }

    removeMosaic(index) {
        this.formItem.mosaicTransferList.splice(index, 1)
    }

    checkInfo() {
        if (!this.isCompleteForm) return
        if (!this.checkForm()) return
        this.showDialog()

    }

    showDialog() {
        const {address, remark, mosaicTransferList, isEncryption, innerFee, lockFee, aggregateFee, multisigPublickey} = this.formItem

        this.transactionDetail = {
            "transaction_type": 'Multisign_transfer',
            "Public_account": multisigPublickey,
            "transfer_target": address,
            "mosaic": mosaicTransferList.map(item => {
                return item.id.id.toHex() + `(${item.amount.compact()})`
            }).join(','),
            "fee": innerFee + lockFee + aggregateFee + 'gas',
            "remarks": remark,
            "encryption": isEncryption,
        }
        this.otherDetails = {
            lockFee: lockFee
        }
        this.sendTransaction()
        this.showCheckPWDialog = true
    }

    sendTransaction() {
        if (this.currentMinApproval == 0) {
            return
        }
        const that = this
        const {networkType, node} = this
        let {address, innerFee, lockFee, aggregateFee, mosaicTransferList, isEncryption, remark, multisigPublickey} = this.formItem
        const transaction = new TransactionApiRxjs().transferTransaction(
            networkType,
            innerFee,
            address,
            mosaicTransferList,
            isEncryption ? MessageType.EncryptedMessage : MessageType.PlainMessage,
            remark
        )

        if (this.currentMinApproval > 1) {
            const aggregateTransaction = createBondedMultisigTransaction(
                [transaction],
                multisigPublickey,
                networkType,
                innerFee
            )
            this.transactionList = [aggregateTransaction]
            return
        }
        const aggregateTransaction = createCompleteMultisigTransaction(
            [transaction],
            multisigPublickey,
            networkType,
            aggregateFee
        )
        this.transactionList = [aggregateTransaction]
    }

    getMultisigAccountList() {
        const that = this
        if (!this.getWallet.address) return
        const {address} = this.getWallet
        const {node} = this

        new MultisigApiRxjs().getMultisigAccountInfo(address, node).subscribe((multisigInfo) => {
            if (multisigInfo.multisigAccounts.length == 0) {
                that.isShowPanel = false
                return
            }
            that.multisigPublickeyList = multisigInfo.multisigAccounts.map((item: any) => {
                item.value = item.publicKey
                item.label = item.publicKey
                return item
            })
        })
    }

    checkForm() {
        const {address, innerFee, lockFee, aggregateFee, multisigPublickey} = this.formItem

        // multisig check
        if (multisigPublickey.length !== 64) {
            this.showErrorMessage(this.$t(Message.ILLEGAL_PUBLICKEY_ERROR))
            return false
        }
        if (address.length < 40) {
            this.showErrorMessage(this.$t(Message.ADDRESS_FORMAT_ERROR))
            return false
        }


        if ((!Number(aggregateFee) && Number(aggregateFee) !== 0) || Number(aggregateFee) < 0) {
            this.showErrorMessage(this.$t(Message.FEE_LESS_THAN_0_ERROR))
            return false
        }

        if ((!Number(innerFee) && Number(innerFee) !== 0) || Number(innerFee) < 0) {
            this.showErrorMessage(this.$t(Message.FEE_LESS_THAN_0_ERROR))
            return false
        }
        if ((!Number(lockFee) && Number(lockFee) !== 0) || Number(lockFee) < 0) {
            this.showErrorMessage(this.$t(Message.FEE_LESS_THAN_0_ERROR))
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

    async initMosaic(accountAddress: string) {
        const that = this
        const {currentXEM1, currentXEM2, node} = this
        const mosaicList: Mosaic[] = await getMosaicList(accountAddress, node)
        that.mosaicList = await buildMosaicList(mosaicList, currentXEM1, currentXEM2)
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


    @Watch('formItem.multisigPublickey')
    async onMultisigPublickeyChange() {
        const that = this
        const {multisigPublickey} = this.formItem
        const {node, networkType} = this
        let address = Address.createFromPublicKey(multisigPublickey, networkType)['address']
        await this.initMosaic(address)
        new MultisigApiRxjs().getMultisigAccountInfo(address, node).subscribe((multisigInfo) => {
            that.currentMinApproval = multisigInfo.minApproval
            that.currentCosignatoryList = multisigInfo.cosignatories
        })
    }

    // @Watch('formItem', {immediate: true, deep: true})
    // onFormItemChange() {
    //     const {address, mosaic, amount, bondedFee, lockFee, aggregateFee, multisigPublickey} = this.formItem
    //     // isCompleteForm
    //     this.isCompleteForm = address !== '' && mosaic !== '' && parseInt(amount.toString()) >= 0 && multisigPublickey !== '' &&
    //         bondedFee > 0 && lockFee > 0 && aggregateFee > 0
    // }

    created() {
        console.log(this.activeAccount)
        this.getMultisigAccountList()
    }

}
