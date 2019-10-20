import {mapState} from 'vuex'
import {Component, Vue} from 'vue-property-decorator'
import {networkTypeConfig} from '@/config/view/setting'
import trezor from '@/core/utils/trezor';
import {Address, NetworkType} from 'nem2-sdk';
import {ExtendedKey, KeyEncoding} from "nem2-hd-wallets";
import {AppInfo, StoreAccount, AppWallet} from '@/core/model'
import {CreateWalletType} from '@/core/model/CreateWalletType'

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
    trezorForm = this.getDefaultFormValues()

    toWalletDetails() {
        this.$Notice.success({
            title: this['$t']('Imported_wallet_successfully') + ''
        })
        this.$router.push('dashBoard')
    }

    toBack() {
        this.$router.push('initAccount')
    }

    numExistingTrezorWallets(networkType){
        // TODO: make it so this.app is defined by this stage
        // const existingTrezorWallets = this.app.walletList.filter(wallet => {
        //     return wallet.sourceType === CreateWalletType.trezor && wallet.networkType === networkType
        // });

        // return existingTrezorWallets.length;

        return 0;
    }

    getDefaultFormValues() {
        const numExistingTrezorWallets = this.numExistingTrezorWallets(NetworkType.MIJIN_TEST);

        return {
            networkType: NetworkType.MIJIN_TEST,
            accountIndex: numExistingTrezorWallets,
            walletName: `Trezor Wallet ${numExistingTrezorWallets + 1}`
        }
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
            this.toWalletDetails();
        } catch (e) {
            this.$store.commit('SET_UI_DISABLED', {
                isDisabled: false,
                message: ""
            });
        }
    }
}
