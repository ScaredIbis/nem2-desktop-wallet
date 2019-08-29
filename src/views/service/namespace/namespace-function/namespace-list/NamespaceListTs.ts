import {formatSeconds} from '@/core/utils/utils.ts'
import {Component, Vue} from 'vue-property-decorator'
import NamespaceEditDialog from './namespace-edit-dialog/NamespaceEditDialog.vue'

@Component({
    components: {
        NamespaceEditDialog
    }
})
export class NamespaceListTs extends Vue {
    showNamespaceEditDialog = false
    currentNamespace = ''

    get namespaceList() {
        return this.$store.state.account.namespace
    }

    get nowBlockHeihgt() {
        return this.$store.state.app.chainStatus.currentHeight
    }

    showEditDialog(namespaceName) {
        this.currentNamespace = namespaceName
        this.showNamespaceEditDialog = true
    }

    closeNamespaceEditDialog() {
        this.showNamespaceEditDialog = false
    }

    computeDuration(namespaceInfo) {
        const {duration, isActive} = namespaceInfo
        if (!isActive) {
            return 'Expired'
        }
        const expireTime = duration - this.nowBlockHeihgt > 0 ? duration - this.nowBlockHeihgt : 'not active'
        return expireTime
    }

    durationToTime(duration) {
        const durationNum = Number(duration - this.nowBlockHeihgt)
        return formatSeconds(durationNum * 12)

    }
}
