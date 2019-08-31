import {Message} from "@/config/index.ts"
import {WalletApiRxjs} from "@/core/api/WalletApiRxjs.ts"
import {NamespaceApiRxjs} from "@/core/api/NamespaceApiRxjs.ts"
import {TransactionApiRxjs} from "@/core/api/TransactionApiRxjs.ts"
import {Component, Vue, Prop, Watch} from 'vue-property-decorator'
import {EmptyAlias} from "nem2-sdk/dist/src/model/namespace/EmptyAlias"
import {Account, Crypto, AliasActionType, NamespaceId, MosaicId} from "nem2-sdk"
import {decryptKey} from "@/core/utils/wallet.ts"
import {signAndAnnounceNormal} from '@/core/utils/wallet.ts'
import {mapState} from "vuex"

@Component({
    computed: {
        ...mapState({
            activeAccount: 'account',
            app: 'app',
        })
    }
})
export class MosaicAliasDialogTs extends Vue {
    activeAccount:any
    app:any
    show = false
    isCompleteForm = false
    mosaic = {
        aliasName: '',
        fee: 50000,
        password: ''
    }
    aliasNameList: any[] = []

    @Prop()
    showMosaicAliasDialog: boolean
    @Prop()
    itemMosaic: any

    get getWallet() {
        return this.activeAccount.wallet
    }

    get generationHash() {
        return this.activeAccount.generationHash
    }

    get node() {
        return this.activeAccount.node
    }

    get namespaceList() {
        return this.activeAccount.namespace
    }

    mosaicAliasDialogCancel() {
        this.initForm()
        this.$emit('closeMosaicAliasDialog')
    }

    updateMosaicAlias() {
        this.checkNamespaceForm()
    }

    checkInfo() {
        const {mosaic} = this

        if (mosaic.fee === 0) {
            this.$Notice.error({
                title: '' + this.$t(Message.INPUT_EMPTY_ERROR)
            })
            return false
        }
        if (mosaic.aliasName === '') {
            this.$Notice.error({
                title: '' + this.$t(Message.INPUT_EMPTY_ERROR)
            })
            return false
        }
        if (mosaic.password === '') {
            this.$Notice.error({
                title: '' + this.$t(Message.INPUT_EMPTY_ERROR)
            })
            return false
        }
        return true
    }

    checkNamespaceForm() {
        if (!this.isCompleteForm) return
        if (!this.checkInfo()) return
        this.decryptKey()
    }

    decryptKey() {
        this.checkPrivateKey(decryptKey(this.getWallet, this.mosaic.password))
    }

    checkPrivateKey(DeTxt) {
        const that = this
        try {
            new WalletApiRxjs().getWallet(
                this.getWallet.name,
                DeTxt.length === 64 ? DeTxt : '',
                this.getWallet.networkType,
            )
            this.updateMosaic(DeTxt)
        } catch (e) {
            that.$Notice.error({
                title: this.$t('password_error') + ''
            })
        }
    }

    async updateMosaic(key) {
        const that = this
        const {node, generationHash} = this
        const account = Account.createFromPrivateKey(key, this.getWallet.networkType)
        let transaction = new NamespaceApiRxjs().mosaicAliasTransaction(
            AliasActionType.Link,
            new NamespaceId(that.mosaic.aliasName),
            new MosaicId(that.mosaic['hex']),
            this.getWallet.networkType,
            that.mosaic.fee
        )
        signAndAnnounceNormal(account, node, generationHash, [transaction], this.showNotice())
        that.initForm()
        that.updatedMosaicAlias()
    }

    showNotice() {
        this.$Notice.success({
            title: this.$t(Message.SUCCESS) + ''
        })
    }

    updatedMosaicAlias() {
        this.show = false
        this.mosaicAliasDialogCancel()
    }

    initForm() {
        this.mosaic = {
            aliasName: '',
            fee: 50000,
            password: ''
        }
    }

    initData() {
        let list = []
        this.namespaceList.map((item, index) => {
            if (item.alias instanceof EmptyAlias) {
                list.push(item)
            }
        })
        this.aliasNameList = list
    }

    @Watch('showMosaicAliasDialog')
    onShowMosaicAliasDialogChange() {
        this.show = this.showMosaicAliasDialog
        Object.assign(this.mosaic, this.itemMosaic)
        this.initData()
    }

    @Watch('namespaceList')
    onNamespaceListChange() {
        this.initData()
    }

    @Watch('mosaic', {immediate: true, deep: true})
    onFormItemChange() {
        const {aliasName, fee, password} = this.mosaic
        // isCompleteForm
        this.isCompleteForm = aliasName !== '' && fee > 0 && password !== ''
    }
}
