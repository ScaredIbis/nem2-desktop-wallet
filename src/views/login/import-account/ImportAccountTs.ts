import {Vue, Component} from 'vue-property-decorator'
import {importStepBarTitleList, importTrezorStepBarTitleList} from "@/config/view"
import routes from '@/router/routers'

@Component
export default class ImportAccountTs extends Vue {    
    stepBarTitleList = []

    created() {
        const {isTrezor} = this.$route.meta
        this.stepBarTitleList = importStepBarTitleList
        if (isTrezor) {
            this.stepBarTitleList = importTrezorStepBarTitleList
        }   
    }
    
    get currentRouterIndex() {
        const {index} = this.$route.meta               
        return index
    }

    getStepTextClassName(index) {
        return Number(this.currentRouterIndex) > index ? 'white' : 'gray'
    }
}
