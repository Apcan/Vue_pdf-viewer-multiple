
import pdfview_muti from './pdfviewer.vue'

export default pdfview_muti

if (typeof window !== 'undefined' && window.Vue) {
    window.Vue.component('pdfviewer', pdfview_muti)
}