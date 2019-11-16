import {mapState} from 'vuex'
import {Message} from "@/config/index.ts"
import {Component, Vue, Provide} from 'vue-property-decorator'
import {Password, Account, NetworkType} from "nem2-sdk"
import CheckPasswordDialog from '@/components/check-password-dialog/CheckPasswordDialog.vue'
import {formDataConfig} from '@/config/view/form'
import {networkTypeConfig} from '@/config/view/setting'
import {AppWallet, AppInfo, StoreAccount} from "@/core/model"
import {cloneData} from "@/core/utils"
import ErrorTooltip from '@/components/other/forms/errorTooltip/ErrorTooltip.vue'
import {standardFields} from '@/core/validation'

@Component({
    computed: {
        ...mapState({
            activeAccount: 'account',
            app: 'app'
        })
    },
    components: {CheckPasswordDialog, ErrorTooltip}
})
export class WalletImportPrivatekeyTs extends Vue {
    @Provide() validator: any = this.$validator
    activeAccount: StoreAccount
    app: AppInfo
    NetworkTypeList = networkTypeConfig
    NetworkType = NetworkType
    standardFields = standardFields
    account = {}
    formItems = cloneData(formDataConfig.walletImportPrivateKeyForm)
    networkType = networkTypeConfig
    showCheckPWDialog = false

    get currentAccount() {
        return this.activeAccount.currentAccount
    }

    get accountNetworkType() {
        return this.currentAccount.networkType
    }

    submit() {
        this.$validator
        .validate()
        .then((valid) => {
            if (!valid) return
            this.showCheckPWDialog = true
        })
    }

    passwordValidated(password) {
        if (!password) return
        this.importWallet(password)
    }

    importWallet(password) {
        const {accountNetworkType} = this
        const {walletName, privateKey} = this.formItems
        try {
            new AppWallet().createFromPrivateKey(
                walletName,
                new Password(password),
                privateKey,
                accountNetworkType,
                this.$store
            )
            this.$Notice.success({
                title: this['$t']('Import_private_key_operation') + '',
            })
            this.$emit('toWalletDetails')
        } catch (error) {
            console.error(error)
            this.$Notice.error({
                title: this.$t(Message.OPERATION_FAILED_ERROR) + ''
            })
        }
    }

    showNotice(text) {
        this.$Notice.destroy()
        this.$Notice.error({
            title: text + ''
        })
    }

    initForm() {
        this.formItems = cloneData(formDataConfig.walletImportPrivateKeyForm)
    }
}
