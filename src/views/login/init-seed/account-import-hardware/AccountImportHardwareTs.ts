import {mapState} from 'vuex'
import {Component, Vue} from 'vue-property-decorator'
import {networkTypeConfig} from '@/config/view/setting';
import trezor from '@/core/utils/trezor';

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

    async loginToTrezor() {
        console.log(trezor);
        // TODO: use a randomly generated challenge from a server
        // see https://github.com/trezor/connect/blob/develop/docs/methods/requestLogin.md
        const result = await trezor.requestLogin({
            challengeHidden: '0123456789abcdef',
            challengeVisual: 'Login to',
        });

        // a successful result will contain
        console.log('RESULT', result);
    }
}
