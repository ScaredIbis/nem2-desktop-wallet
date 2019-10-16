import {mapState} from 'vuex'
import {Component, Vue} from 'vue-property-decorator'
import {formDataConfig} from "@/config/view/form";
import {networkTypeConfig} from '@/config/view/setting'
import trezor from '@/core/utils/trezor';
import {Address} from 'nem2-sdk';
import {ExtendedKey, KeyEncoding} from "nem2-hd-wallets";
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

        try {
            const publicKeyResult = await trezor.getPublicKey({
                path: `m/44'/43'/${accountIndex}'`,
                coin: "NEM"
            })

            if(publicKeyResult.success) {
                const { xpub, serializedPath } = publicKeyResult.payload;

                const extendedPublicKey = ExtendedKey.createFromBase58(xpub);
                const publicKey = extendedPublicKey.getPublicKey(KeyEncoding.ENC_HEX).toString().toUpperCase();
                const address = Address.createFromPublicKey(publicKey, networkType);

                new AppWallet().createFromTrezor(
                    walletName,
                    networkType,
                    serializedPath,
                    publicKey,
                    address.plain(),
                    this.$store
                );
            }

            this.$store.commit('SET_UI_DISABLED', {
                isDisabled: false,
                message: ""
            });
        } catch (e) {
            this.$store.commit('SET_UI_DISABLED', {
                isDisabled: false,
                message: ""
            });
        }
    }
}
