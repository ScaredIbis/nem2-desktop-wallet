import {mapState} from 'vuex'
import {Component, Vue} from 'vue-property-decorator'
import {networkTypeConfig} from '@/config/view/setting'
import {formDataConfig} from "@/config/view/form";
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
export class WalletImportHardwareTs extends Vue {
    activeAccount: StoreAccount
    app: AppInfo
    NetworkTypeList = networkTypeConfig
    account = {}
    showCheckPWDialog = false
    trezorForm = formDataConfig.trezorImportForm

    created(){
        // prefill the form fields based on number of existing trezor wallets
        // use MIJIN_TEST by default
        this.trezorForm = this.getDefaultFormValues(NetworkType.MIJIN_TEST);
    }

    toWalletDetails() {
        this.$Notice.success({
            title: this['$t']('Imported_wallet_successfully') + ''
        })
        this.$router.push('dashBoard')
    }

    toBack() {
        this.$router.push('initAccount')
    }

    onNetworkSelected(){
        this.trezorForm = this.getDefaultFormValues(this.trezorForm.networkType);
    }

    numExistingTrezorWallets(networkType){
        const existingTrezorWallets = this.app.walletList.filter(wallet => {
            return wallet.sourceType === CreateWalletType.trezor && wallet.networkType === networkType
        });

        return existingTrezorWallets.length;
    }

    getDefaultFormValues(networkType) {
        const numExistingTrezorWallets = this.numExistingTrezorWallets(networkType);
        const networkName = networkTypeConfig.find(network => network.value === networkType).label;

        return {
            networkType: networkType,
            accountIndex: numExistingTrezorWallets,
            walletName: `${networkName} Trezor Wallet ${numExistingTrezorWallets + 1}`
        }
    }

    async importAccountFromTrezor() {
        const { accountIndex, networkType, walletName } = this.trezorForm

        this.$store.commit('SET_UI_DISABLED', {
            isDisabled: true,
            message: "trezor_awaiting_interaction"
        });

        try {

            const publicKeyResult = await trezor.nem2GetPublicKey({
                path: `m/44'/43'/${accountIndex}'/0'/0'`
            })

            if(publicKeyResult.success) {
                const { publicKey, serializedPath } = publicKeyResult.payload;

                const address = Address.createFromPublicKey(publicKey, networkType);

                new AppWallet().createFromTrezor(
                    walletName,
                    networkType,
                    serializedPath,
                    publicKey.toUpperCase(),
                    address.plain(),
                    this.$store
                );

                this.toWalletDetails();
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