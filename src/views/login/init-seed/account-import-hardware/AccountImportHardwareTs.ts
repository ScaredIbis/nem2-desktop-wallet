import {mapState} from 'vuex'
import {Component, Vue} from 'vue-property-decorator'
import {formDataConfig} from "@/config/view/form";
import {networkTypeConfig} from '@/config/view/setting'
import trezor from '@/core/utils/trezor';

import { AppWallet } from '@/core/utils/wallet';

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

    async importAccountFromTrezor() {
        const { accountIndex, networkType, walletName } = this.trezorForm
        console.log(trezor);

        // TODO: turn it on for real when we have a device

        const publicKeyResult = await trezor.getPublicKey({
            path: `m/44'/43'/${accountIndex}'`,
            network: networkType
        })

        const accountResult = await trezor.nemGetAddress({
            path: `m/44'/43'/${accountIndex}'`,
            network: networkType
        })

        // a successful result will contain
        console.log('RESULT', accountResult, publicKeyResult);

        if(accountResult.success && publicKeyResult.success) {
            const { serializedPath, address } = accountResult.payload;
            const { publicKey } = publicKeyResult.payload;

            new AppWallet().createFromTrezor(
                walletName,
                networkType,
                serializedPath,
                publicKey,
                address,
                this.$store
            );
        } else {
            console.log('AUTHENTICATION FAILED: ', accountResult);
        }
    }
}
