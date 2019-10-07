import {mapState} from 'vuex'
import {Component, Vue} from 'vue-property-decorator'
import {formDataConfig} from "@/config/view/form";
import {networkTypeConfig} from '@/config/view/setting'
import trezor from '@/core/utils/trezor';
import {Address} from 'nem2-sdk';
import {AppInfo, StoreAccount, AppWallet} from '@/core/model'

@Component({
    computed: {
        ...mapState({
            activeAccount: 'account',
            app: 'app'
        })
    }
})
export class AccountImportHardwareTs extends Vue {
    activeAccount: StoreAccount
    app: AppInfo
    NetworkTypeList = networkTypeConfig
    account = {}
    showCheckPWDialog = false
    // TODO: prefill values (account Index and wallet name)
    // based on number of existing trezor accounts
    trezorForm = formDataConfig.trezorImportForm

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

        this.$store.commit('SET_UI_DISABLED', {
            isDisabled: true,
            message: "trezor_awaiting_interaction"
        });

        const publicKeyResult = await trezor.getPublicKey({
            path: `m/44'/43'/${accountIndex}'`,
            coin: "NEM"
        })

        if(publicKeyResult.success) {
            const { publicKey, serializedPath } = publicKeyResult.payload;

            // @see https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki
            // ser-p(P) serializes the coordinate and prepends either 0x02 or 0x03 to it.
            // drop first byte for 32-bytes public key
            const rawPublicKey = publicKey.slice(2).toUpperCase();
            const address = Address.createFromPublicKey(rawPublicKey, networkType);

            new AppWallet().createFromTrezor(
                walletName,
                networkType,
                serializedPath,
                rawPublicKey,
                address.plain(),
                this.$store
            );
        }

        this.$store.commit('SET_UI_DISABLED', {
            isDisabled: false,
            message: ""
        });
    }
}
