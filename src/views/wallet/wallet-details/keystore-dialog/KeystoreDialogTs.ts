import {Component, Vue, Prop, Provide} from 'vue-property-decorator'
import {mapState} from "vuex"
import {Message} from "@/config/index.ts"
import {copyTxt} from "@/core/utils"
import {validation} from '@/core/validation'
import {AppWallet, StoreAccount} from "@/core/model"
import ErrorTooltip from '@/components/other/forms/errorTooltip/ErrorTooltip.vue'

@Component({
    computed: {
        ...mapState({
            activeAccount: 'account',
        })
    },
    components: {ErrorTooltip}
})
export class KeystoreDialogTs extends Vue {
    @Provide() validator: any = this.$validator
    activeAccount: StoreAccount
    validation = validation
    stepIndex = 0
    QRCode = ''
    keystoreText = ''
    wallet = {
        password: ''
    }

    @Prop()
    showKeystoreDialog: boolean

    get show() {
        return this.showKeystoreDialog
    }

    set show(val) {
        if (!val) {
            this.$emit('closeKeystoreDialog')
        }
    }

    get getWallet() {
        return this.activeAccount.wallet
    }

    checkWalletPassword() {
        this.$validator
            .validate()
            .then((valid) => {
                if (valid) this.stepIndex = 1
            })
    }

    exportKeystore() {
        switch (this.stepIndex) {
            case 0:
                this.checkWalletPassword()
                break
            case 1:
                this.generateKeystore()
                break
            case 2:
                this.stepIndex = 3
                break
        }
    }

    async generateKeystore() {
        this.keystoreText = new AppWallet(this.getWallet).getKeystore()
        this.stepIndex = 2
    }

    copyKeystore() {
        copyTxt(this.keystoreText).then((data) => {
            this.$Notice.success({
                title: this.$t(Message.COPY_SUCCESS) + ''
            })
        }).catch((error) => {
            console.log(error)
        })
    }
}
