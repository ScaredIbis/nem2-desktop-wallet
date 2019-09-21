import {mapState} from 'vuex'
import {Component, Vue} from 'vue-property-decorator'
import {networkTypeConfig} from '@/config/view/setting';
import TrezorConnect from 'trezor-connect';

console.log(TrezorConnect);

@Component({
    computed: {
        ...mapState({
            activeAccount: 'account',
            app: 'app'
        })
    }
})
export class AccountImportHardwareTs extends Vue {
    activeAccount: any
    app: any
    NetworkTypeList = networkTypeConfig
    account = {}
    showCheckPWDialog = false

    get getNode() {
        return this.activeAccount.node
    }

    get currentXEM1() {
        return this.activeAccount.currentXEM1
    }

    get walletList() {
        return this.app.walletList
    }

    toWalletDetails() {
        this.$Notice.success({
            title: this['$t']('Imported_wallet_successfully') + ''
        })
        this.$store.commit('SET_HAS_WALLET', true)
        this.$router.push('dashBoard')
    }

    toBack() {
        this.$router.push('initAccount')
    }
}
