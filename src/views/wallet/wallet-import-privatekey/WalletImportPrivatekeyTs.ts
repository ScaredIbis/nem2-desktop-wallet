import {Message, networkTypeList} from "@/config/index.ts"
import {Component, Vue} from 'vue-property-decorator'
import {Account, NetworkType} from "nem2-sdk"
import {encryptKey, getAccountDefault, saveLocalWallet} from "@/core/utils/wallet.ts"
import {
    ALLOWED_SPECIAL_CHAR,
    MAX_PASSWORD_LENGTH,
    MIN_PASSWORD_LENGTH
} from "@/core/validation"
import {mapState} from "vuex"

@Component({
    computed: {
        ...mapState({
            activeAccount: 'account',
            app: 'app'
        })
    }
})
export class WalletImportPrivatekeyTs extends Vue {
    MIN_PASSWORD_LENGTH = MIN_PASSWORD_LENGTH
    MAX_PASSWORD_LENGTH = MAX_PASSWORD_LENGTH
    ALLOWED_SPECIAL_CHAR = ALLOWED_SPECIAL_CHAR
    activeAccount: any
    app: any
    account = {}
    form = {
        privateKey: 'FB628AF4276F696AD1FA85B7AB1E49CFD896E5EC85000E3179EEEA59717DD8DE',
        networkType: 0,
        walletName: '',
        password: '',
        checkPW: '',
    }
    NetworkTypeList = networkTypeList

    get getNode() {
        return this.activeAccount.node
    }

    get currentXEM1() {
        return this.activeAccount.currentXEM1
    }

    get currentXEM2() {
        return this.activeAccount.currentXEM2
    }

    get walletList() {
        return this.app.walletList
    }

    importWallet() {
        if (!this.checkPrivateKey()) return
        if (!this.checkImport()) return
        this.loginWallet(this.account)
    }

    checkImport() {
        if (this.form.networkType == 0) {
            this.$Notice.error({
                title: this.$t(Message.PLEASE_SWITCH_NETWORK) + ''
            })
            return false
        }
        if (!this.form.walletName || this.form.walletName == '') {
            this.$Notice.error({
                title: this.$t(Message.WALLET_NAME_INPUT_ERROR) + ''
            })
            return false
        }
        // if (!passwordValidator(this.form.password)) {
        //     this.$Notice.error({
        //         title: this.$t(Message.PASSWORD_SETTING_INPUT_ERROR) + ''
        //     })
        //     return false
        // }

        if (!this.form.password || this.form.password.length < 6 || this.form.password.length > 32) {
            this.$Notice.error({
                title: this.$t(Message.PASSWORD_SETTING_INPUT_ERROR) + ''
            })
            return false
        }
        if (this.form.password !== this.form.checkPW) {
            this.$Notice.error({
                title: this.$t(Message.INCONSISTENT_PASSWORD_ERROR) + ''
            })
            return false
        }
        return true
    }

    checkPrivateKey() {
        try {
            if (!this.form.privateKey || this.form.privateKey === '') {
                this.$Notice.error({
                    title: this.$t(Message.PASSWORD_SETTING_INPUT_ERROR) + ''
                })
                return false
            }
            const account = Account.createFromPrivateKey(this.form.privateKey, this.form.networkType)
            this.account = account
            return true
        } catch (e) {
            this.$Notice.error({
                title: this.$t(Message.PASSWORD_SETTING_INPUT_ERROR) + ''
            })
            return false
        }
    }

    loginWallet(account) {
        const that = this
        const walletName: any = this.form.walletName
        const netType: NetworkType = this.form.networkType
        const {walletList} = this
        const style = 'walletItem_bg_' + walletList.length % 3
        getAccountDefault(walletName, account, netType, this.getNode, this.currentXEM1, this.currentXEM2)
            .then((wallet) => {
                let storeWallet = wallet
                storeWallet['style'] = style
                that.$store.commit('SET_WALLET', storeWallet)
                const encryptObj = encryptKey(storeWallet['privateKey'], that.form['password'])
                saveLocalWallet(storeWallet, encryptObj, null, {})
                this.toWalletDetails()
            }).catch((error) => {
            console.log(error)
        })
    }

    toWalletDetails() {
        this.$Notice.success({
            title: this['$t']('Import_private_key_operation') + '',
        })
        this.$store.commit('SET_HAS_WALLET', true)
        this.$emit('toWalletDetails')
    }

    toBack() {
        this.$emit('closeImport')
    }

}
