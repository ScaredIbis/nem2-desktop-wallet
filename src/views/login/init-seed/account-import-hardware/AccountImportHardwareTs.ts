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


        // const publicKeyResult = await trezor.getPublicKey({
        //     path: `m/44'/43'/${accountIndex}'`,
        //     network: networkType
        // })

        const publicKeyResult = {
            success: true,
            payload: {
                address: 'TAXQ2KXXMRZHPD7T2PF3KMXFW6RFW5RLOYLDMMHV', // my testnet wallet
                path: [44, 43, 1, 0, accountIndex], // example path from from nemSignTransaction docs
                // https://github.com/trezor/connect/blob/develop/docs/methods/nemSignTransaction.md
                // https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki
                serializedPath: `m/44'/43'/1'/0/${accountIndex}`,
                // xpub: string,        // xpub in legacy format
                // xpubSegwit?: string, // optional for segwit accounts: xpub in segwit format
                // chainCode: string,   // BIP32 serialization format
                // childNum: number,    // BIP32 serialization format
                publicKey: 'D783A98F4322B212FCBC3296918401F3B46979385393A953DC37339CA050D9B3',   // BIP32 serialization format
                // fingerprint: number, // BIP32 serialization format
                // depth: number,
            }
        }




        // const accountResult = await trezor.nemGetAddress({
        //     path: `m/44'/43'/${accountIndex}'`,
        //     network: networkType
        // })

        // this is the shape of a successful device interaction
        const accountResult = {
            success: true,
            payload: {
                address: 'TAXQ2KXXMRZHPD7T2PF3KMXFW6RFW5RLOYLDMMHV', // my testnet wallet
                path: [44, 43, 1, 0, accountIndex], // example path from from nemSignTransaction docs
                // https://github.com/trezor/connect/blob/develop/docs/methods/nemSignTransaction.md
                // https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki
                serializedPath: `m/44'/43'/1'/0/${accountIndex}`,
            }
        }

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
