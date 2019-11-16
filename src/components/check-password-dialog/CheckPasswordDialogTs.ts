import { mapState } from "vuex"
import { Message } from "@/config/index.ts"
import { Component, Vue, Prop, Watch, Provide } from 'vue-property-decorator'
import { standardFields } from '@/core/validation'
import { StoreAccount } from "@/core/model"
import ErrorTooltip from '@/components/other/forms/errorTooltip/ErrorTooltip.vue'

@Component({
    computed: { ...mapState({ activeAccount: 'account' }) },
    components: { ErrorTooltip },
})
export class CheckPasswordDialogTs extends Vue {
    @Provide() validator: any = this.$validator
    activeAccount: StoreAccount
    standardFields = standardFields
    password = ''

    @Prop({ default: false })
    visible: boolean

    @Prop({ default: false })
    returnPassword: boolean

    get show(): boolean {
        return this.visible
    }

    set show(val) {
        if (!val) {
            this.$emit('close')
        }
    }

    get accountPassword() {
        return this.activeAccount.currentAccount.name
    }

    submit() {
        this.$validator
            .validate()
            .then((valid) => {
                const response = valid && this.returnPassword ? this.password : valid
                this.$emit('passwordValidated', response)
                this.show = false
            })
    }

    showNotice() {
        this.$Notice.success({
            title: this.$t(Message.SUCCESS) + ''
        })
    }
}
