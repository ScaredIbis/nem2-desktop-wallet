
import {Message, networkType} from "@/config/index.ts"
import {NetworkType} from "nem2-sdk"
import {Component, Prop, Vue} from 'vue-property-decorator'
import {strToHexCharCode} from '@/core/utils/utils.ts'
import {createAccount, randomMnemonicWord} from "@/core/utils/hdWallet.ts"
import {encryptKey, getAccountDefault, saveLocalWallet} from "@/core/utils/wallet.ts"

@Component
export class WalletCreatedTs extends Vue{

    tags = 0
    mosaics = []
    storeWallet = {}
    showCover = true
    mnemonicRandomArr = []
    formItem = {
        currentNetType: '',
        walletName: '',
        password: '',
        checkPW: '',
    }
    netType = networkType;


    @Prop({default:{}})
    createForm: any


    get mnemonic () {
        const mnemonic = this.$store.state.app.mnemonic
        return mnemonic['split'](' ')
    }

    get formInfo () {
        return this.createForm;
    }

    get node () {
        return 'http://120.79.181.170:3000'
    }

    get walletList () {
        return this.$store.state.app.walletList
    }

    hideCover () {
        this.showCover = false
    }

    sureWord (index) {
        const word = this.mnemonicRandomArr[index]
        const wordSpan = document.createElement('span');
        wordSpan.innerText = word;
        wordSpan.onclick = () => {
            this.$refs['mnemonicWordDiv']['removeChild'](wordSpan)
        }
        this.$refs['mnemonicWordDiv']['append'](wordSpan)
    }

    checkMnemonic () {
        const mnemonicDiv = this.$refs['mnemonicWordDiv'];
        const mnemonicDivChild = mnemonicDiv['getElementsByTagName']('span');
        let childWord = []
        for(let i in mnemonicDivChild){
            if( typeof mnemonicDivChild[i] !== "object") continue;
            childWord.push(mnemonicDivChild[i]['innerText'])
        }
        if (JSON.stringify(childWord) != JSON.stringify(this.mnemonic)) {
            if (childWord.length < 1) {
                this.$Notice.warning({title:''+this.$t(Message.PLEASE_ENTER_MNEMONIC_INFO)})
            } else {
                this.$Notice.warning({title:''+this.$t(Message.MNEMONIC_INCONSISTENCY_ERROR)})
            }
            return false
        }
        return true
    }

    changeTabs (index) {
        switch (index) {
            case 0:
                this.tags = index
                break;
            case 1:
                this.mnemonicRandomArr = randomMnemonicWord(this.mnemonic)
                this.tags = index
                break;
            case 2:
                if(!this.checkMnemonic()){
                    return
                }
                const account = createAccount(this.mnemonic.join(' '))
                this.$store.commit('SET_ACCOUNT',account);
                this.loginWallet(account)
                this.tags = index
                break;
        }
    }

    skipInput (index) {
        const account = createAccount(this.mnemonic.join(' '))
        this.$store.commit('SET_ACCOUNT',account);
        this.loginWallet(account)
        this.tags = index
    }


    loginWallet (account) {
        const that = this
        const walletName:any = this.formInfo['walletName'];
        const netType:NetworkType = Number(this.formInfo['currentNetType'])
        const walletList = this.$store.state.app.walletList
        const style = 'walletItem_bg_' + walletList.length % 3
        getAccountDefault(walletName, account, netType).then((wallet)=>{
            let storeWallet = wallet
            storeWallet['style'] = style
            that.storeWallet = storeWallet
            that.$store.commit('SET_WALLET', storeWallet)
            const encryptObj = encryptKey(storeWallet['privateKey'], that.formInfo['password'])
            const mnemonicEnCodeObj = encryptKey(strToHexCharCode(this.mnemonic.join(' ')), that.formInfo['password'])
            saveLocalWallet(storeWallet, encryptObj, null, mnemonicEnCodeObj)
        })
    }

    toWalletPage () {
        this.$store.commit('SET_HAS_WALLET',true)
        this.$emit('toWalletDetails')
    }

    toBack () {
        this.$emit('closeCreated')
    }
}
