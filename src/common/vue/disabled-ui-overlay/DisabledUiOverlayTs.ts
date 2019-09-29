import {mapState} from "vuex"
import {Component, Prop, Vue} from 'vue-property-decorator'

@Component({
    computed: {...mapState({activeAccount: 'account'})},
})
export class DisabledUiOverlayTs extends Vue {

    @Prop({ default: false })
    showOverlay: boolean

    get show() {
        return this.showOverlay
    }

    set show(val) {
        if (!val) {
            this.$emit('close')
        }
    }
}
