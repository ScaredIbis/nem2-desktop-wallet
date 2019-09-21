import {mapState} from 'vuex'
import {Component, Vue} from 'vue-property-decorator'
import {formDataConfig} from "@/config/view/form";
import {networkTypeConfig} from '@/config/view/setting'
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
    // TODO: prefill values (account Index and wallet name)
    // based on existing trezor accounts
    trezorForm = formDataConfig.trezorImportForm

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

    async getAccountFromTrezor() {
        const { accountIndex, networkType, walletName } = this.trezorForm
        console.log(trezor);

        try {
            // TODO: turn it on for real when we have a device

            // const result = await trezor.nemGetAddress({
            //     path: `m/44'/43'/${accountIndex}'`,
            //     network: networkType
            // })

            // this is the shape of a successful device interaction
            const result = {
                success: true,
                payload: {
                    address: 'TDS7OQUHKNYMSC2WPJA6QUTLJIO22S27B4FMU2AJ',
                    path: [44, 43, accountIndex], // example path from from nemSignTransaction docs
                    // https://github.com/trezor/connect/blob/develop/docs/methods/nemSignTransaction.md
                    // https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki
                    serializedPath: `m/44'/43'/${accountIndex}`,
                }
            }

            // a successful result will contain
            console.log('RESULT', result);

        } catch (err) {

        }

    }
}
