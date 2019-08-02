<template>
    <div :style='size'  style="position:relative" >
      <div class="content" :class="size?'pdf-w':''"  @scroll.native="ms" @scroll="ms" ref="pdf_container">
 
     <div id="viewerContainer">
           <div ref='pagesviewer' class="pdfViewer"   ></div>
    </div>
      </div>
     <div v-if="showloading" v-show="isloading" class="loading">
          <slot name="loading-view"  >
          <div >
          <Loading class="_load" type='spin' :size="{width: '60px', height: '60px'}"></Loading>
          <p>加载中</p>
          </div>
        </slot>
      </div>
       <div v-if="showloading"  v-show="iscutting" class="loading">
          <slot name="cutting-view"  >
            <div class="cutting">
              <Loading class="_load" :size="{width: '60px', height: '60px'}"></Loading>
              <p>文档处理中</p>
            </div>
          </slot>
       </div>
       <div v-if="showloading"  v-show="notfound" class="loading">
          <slot name="nofound-view"  >
            <div class="nofound">
              <p>文件不存在或处理失败!</p>
            </div>
          </slot>
       </div>
    <div class="status_bar" v-show="statusbar">
      <span class="page_info">{{current_page}}/{{pagecount}}</span>
      <span class="status_info" v-show="fileloading"><loads width='18px' height='18px' style="margin-right:10px"/>加载中</span>
    </div>
    </div>
</template>
<script>
import axios from "axios";
import * as pdfjsDistBuildPdf from "pdfjs-own/build/pdf.js";
import * as pdfjsDistWebPdfViewer from "pdfjs-own/web/pdf_viewer.js";
import Loading from "vue-loading-template";
import loads from "./loading.vue";
import "pdfjs-own/web/pdf_viewer.css";
const get = (_url, obj) => axios(_url, { params: obj });
export default {
  name: "pdfviewMuti",
  props: {
    src: {
      type: [Array]
    },
    startnum: {
      type: [Number],
      default: 1
    },
    initPage: {
      type: [Number],
      default: 1
    },
    IDSrc: {
      type: [String],
      default: ""
    },
    baseUrl: {
      type: [String],
      default: ""
    },
    showloading: {
      type: [Boolean],
      default: true
    },
    statusbar: {
      type: [Boolean],
      default: false
    },
    preload: {
      type: [Boolean],
      default: true
    },
    debug: {
      type: [Boolean],
      default: false
    },
    size: {
      type: [Object],
      default: null
    }
  },
  components: {
    Loading,
    loads
  },
  data() {
    return {
      urls: [],
      mode: 0, //0:src mode | 1:id mode
      pdfViewer: null,
      pdfLinkService: null,
      txtmode: 1,
      DEFAULT_SCALE_DELTA: 1.1,
      MIN_SCALE: 0.25,
      MAX_SCALE: 10.0,
      DEFAULT_SCALE_VALUE: "auto",
      current_page: 1,
      isrender: false,
      compantid: 0,
      current_file: 0,
      pageoffile: 5,
      isloading: false,
      fileloading: false,
      renderquen: [],
      loadedfile: [],
      maxpage_num: 0,
      minpage_num: null,
      iscutting: false,
      notfound: false,
      btnclass: ["btn"],
      pagecount: 0,
      target: 1
    };
  },
  methods: {
    _getpdfstatus: (baseurl, file_id, opt = {}) =>
      get(`${baseurl}/pdf/status/${file_id}`, { ...opt }),
    _getpdffile: (baseurl, type, id, opt = {}) =>
      get(`${baseurl}/pdf/get/${type}/${id}`, { ...opt }),
    zoomin(ticks) {
      let newScale = this.pdfViewer.currentScale;
      do {
        newScale = (newScale * this.DEFAULT_SCALE_DELTA).toFixed(2);
        newScale = Math.ceil(newScale * 10) / 10;
        newScale = Math.min(this.MAX_SCALE, newScale);
      } while (--ticks && newScale < this.MAX_SCALE);
      this.pdfViewer.currentScaleValue = newScale;
    },
    zoomout(ticks) {
      let newScale = this.pdfViewer.currentScale;
      do {
        newScale = (newScale / this.DEFAULT_SCALE_DELTA).toFixed(2);
        newScale = Math.floor(newScale * 10) / 10;
        newScale = Math.max(this.MIN_SCALE, newScale);
      } while (--ticks && newScale > this.MIN_SCALE);
      this.pdfViewer.currentScaleValue = newScale;
    },
    pagechange(evt) {
      this.current_page = ~~evt.page_num;
      this.$emit("pagechange", this.current_page);
    },
    initrenders() {
      return new Promise((resolve, reject) => {
        let container = document.getElementById("viewerContainer");
        let pdfLinkService = new pdfjsDistWebPdfViewer.PDFLinkService();
        let pdfViewer = new pdfjsDistWebPdfViewer.PDFViewer({
          container: container,
          linkService: pdfLinkService,
          textLayerMode: this.txtmode
        });
        this.pdfViewer = pdfViewer;
        pdfLinkService.setViewer(pdfViewer);
        container.addEventListener("pagesinit", () => {
          pdfViewer.currentScaleValue = "page-width";
        });
        this.pdfViewer = pdfViewer;
        this.pdfLinkService = pdfLinkService;
        resolve(true);
      });
    },
    loadingpdf(url) {
      if (!url.includes('http')) url='https://'+url
      return new Promise((resolve, reject) => {
        let CMAP_URL = "pdfjs-dist/cmaps/";
        let CMAP_PACKED = true;
        let loadingtask = pdfjsDistBuildPdf.getDocument({
          url: url,
          cMapUrl: CMAP_URL,
          cMapPacked: CMAP_PACKED
        });
        loadingtask.onProgress = progressData => {
          this.$emit("onProgress", progressData);
        };
        loadingtask.then(pdfDocument => {
          resolve(pdfDocument);
        });
      });
    },
    pdfrender(file_num, preload = false, topage) {
      let current_file = this.getfileofpage(this.current_page);
      if (this.loadedfile.indexOf(file_num) < 0) {
        this.loadedfile.push(file_num);
        return () =>
          new Promise((r, e) => {
            let url = this.urls[file_num];
            this.isrender = true;
            this.isloading = !preload;
            this.$emit("loading", true);
            this.loadingpdf(url)
              .then(pdfDocument => {
                this.pdfViewer.setDocument(
                  pdfDocument,
                  file_num < current_file
                );
                this.pdfLinkService.setDocument(pdfDocument, null);
                return this.pdfViewer.pagesPromise;
              })
              .then(() => {
                this.addpagelinstener(file_num);
                this.isloading = false;
                this.$emit("loading", false);
                this.isrender = false;
                this.notfound = false;
                this.iscutting = false;
                if (topage && preload) this.jumpnum(topage);
                r();
              })
              .catch(e);
          });
      } else return null;
    },
    addpagelinstener(file_num) {
      let pages_div = this.$refs["pagesviewer"];
      if (window.WXEnvironment) pages_div = pages_div.$el;
      pages_div = pages_div.children;
      let io = null;
      for (let i = 0; i < pages_div.length; i++) {
        let page = pages_div[i];
        let isload = page.attributes["isload"];
        if (!isload) {
          let pagenum = page.attributes["data-page-number"].value;
          pagenum = this.getrealpage(file_num, ~~pagenum);
          page.setAttribute("page-num", pagenum);
          page.id = "page_num_" + pagenum;
          if (!this.minpage_num) this.minpage_num = pagenum;
          else this.minpage_num = Math.min(this.minpage_num, pagenum);
          this.maxpage_num = Math.max(this.maxpage_num, pagenum);
          page.setAttribute("isload", true);
        }
      }
      var evObj = document.createEvent("HTMLEvents");
      evObj.initEvent("scroll", true, true);
      let container = this.$refs["pdf_container"];
      if (window.WXEnvironment) container = container.$el;
      container.dispatchEvent(evObj);
    },
    runrenderquen(promise) {
      if (this.isrender) {
        if (promise) this.renderquen.push(promise);
        return;
      } else {
        if (promise) this.renderquen.push(promise);
        if (this.renderquen.length > 0) {
          let redpromise = this.renderquen.shift();
          if (!!redpromise) {
            redpromise().then(() => {
              this.runrenderquen();
            });
          }
        }
      }
    },
    getfileofpage(page_num) {
      let filenum =
        Math.ceil((page_num - (this.startnum - 1)) / this.pageoffile) - 1;
      return filenum < 0 ? 0 : filenum;
    },
    getrealpage(file_num, page_num) {
      return this.startnum - 1 + file_num * this.pageoffile + page_num;
    },
    jumpnum(num) {
      let fileofnum = this.getfileofpage(num);
      if (fileofnum > this.urls.length - 1) {
        this.$emit("exception", "页面不存在");
        alert("页面不存在");
        return;
      }
      if (this.loadedfile.indexOf(fileofnum) < 0) {
        this.resetviewer();
        this.runrenderquen(this.pdfrender(fileofnum, false, num));
      } else
        this.$nextTick(() => {
          eval(`document.getElementById('page_num_${num}').scrollIntoView()`);
        });
    },
    resetviewer() {
      this.minpage_num = null;
      this.maxpage_num = 0;
      this.loadedfile = [];
      this.$refs.pagesviewer.innerHTML = "";
    },
    delay(t = 5 * 1000) {
      return new Promise((r, e) => {
        setTimeout(() => {
          r();
        }, t);
      });
    },
    /**pdf file view back control*/
    getpdfstatus(file_id) {
      return this._getpdfstatus(this.baseUrl, file_id).then(pdfstatus => {
        pdfstatus = pdfstatus.data;
        if (pdfstatus.code === 0) {
          return pdfstatus.data;
        } else {
          throw new Error(pdfstatus.msg);
        }
      });
    },
    getpdffile(file_id) {
      return this._getpdffile(this.baseUrl, "split", file_id).then(
        pdf_children => {
          pdf_children = pdf_children.data;
          if (pdf_children.code === 0) {
            this.pageoffile = pdf_children.data.pageoffile;
            this.pagecount = pdf_children.data.pagecount;
            return pdf_children.data.children;
          } else {
            throw new Error(pdf_children.msg);
          }
        }
      );
    },
    makeurl(child_id) {
      return `${this.baseUrl}/pdf/get/child/${child_id}`;
    },
    /**pdf load mode id */
    loadfromid(file_id) {
      this.getpdfstatus(file_id)
        .then(pdfstatus => {
          if (pdfstatus.cut === 2) {
            this.isloading = false;
            this.$emit("loading", false);
            this.notfound = false;
            this.iscutting = true;
            this.delay().then(() => {
              this.loadfromid(file_id);
            });
          } else if (pdfstatus.cut === 1) {
            this.getpdffile(file_id).then(pdfchildren => {
              this.urls = pdfchildren.map(
                c => (c.cosurl ? c.cosurl : this.makeurl(c._id))
              );
              this.runrenderquen(
                this.pdfrender(this.getfileofpage(this.initPage))
              );
            });
          } else {
            this.isloading = false;
            this.$emit("loading", false);
            this.notfound = true;
            this.iscutting = false;
          }
        })
        .catch(error => {
          this.$emit("exception", error);
          this.notfound = true;
        });
    },
    ms(e) {
      let sctop = e.srcElement.scrollTop;
      let cheight = e.srcElement.clientHeight;
      let cutpagenum = this.issee(sctop + cheight);
      if (this.current_page != cutpagenum && ~~cutpagenum > 0)
        this.pagechange({
          page_num: cutpagenum,
          action: "in"
        });
    },
    issee(sctop) {
      let currentpagenum = 1;
      let pages_div = this.$refs["pagesviewer"];
      if (window.WXEnvironment) pages_div = pages_div.$el;
      pages_div = pages_div.children;
      for (let i = 0; i < pages_div.length; i++) {
        let page = pages_div[i];
        let ptop = page.offsetTop;
        let readpercent = (sctop - ptop) / page.offsetHeight;
        if (readpercent < 0.5) break;
        else currentpagenum = page.getAttribute("page-num");
      }
      return currentpagenum;
    },
    filecount() {
      return this.pagecount;
    }
  },
  mounted() {
    if (this.debug) console.log("debug!");
    this.urls = this.src;
    this.isloading = true;
    this.$on("loading", status => {
      this.fileloading = status;
    });
    this.$emit("loading", true);
    this.initrenders().then(() => {
      if (this.urls)
        this.runrenderquen(this.pdfrender(this.getfileofpage(this.initPage)));
      else if (this.IDSrc && this.baseUrl) {
        this.loadfromid(this.IDSrc);
      } else {
        this.$emit("exception", "参数不完整");
        return;
      }
    });
  },
  watch: {
    current_page: function(val, oldval) {
      let pagetoend = ~~this.maxpage_num - ~~val;
      let pagetostart = ~~val - ~~this.minpage_num;
      let current_file = this.getfileofpage(val);
      if (
        (pagetoend === Math.ceil(this.pageoffile / 2) && this.preload) ||
        pagetoend === 0
      ) {
        if (this.urls.length - 1 > current_file) {
          this.runrenderquen(
            this.pdfrender(
              current_file + 1,
              pagetoend === Math.ceil(this.pageoffile / 2) && this.preload
            )
          );
        }
      }
      if (
        (pagetostart > Math.ceil(this.pageoffile / 2) && this.preload) ||
        pagetostart === 0
      ) {
        if (current_file > 0) {
          this.runrenderquen(
            this.pdfrender(
              //pdfrender跳转到当前页
              current_file - 1,
              pagetostart === Math.ceil(this.pageoffile / 2) && this.preload
            )
          );
        }
      }
    },
    IDSrc: function(val, oldval) {
      this.resetviewer();
      this.loadfromid(this.IDSrc);
    },
    src: function(val, oldval) {
      this.resetviewer();
      this.urls = this.src;
      this.runrenderquen(this.pdfrender(this.getfileofpage(this.initPage)));
    }
  }
};
</script>

<style>
.toolbar {
  position: fixed;
  top: 30px;
  z-index: 10;
}
.loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.692);
  z-index: 15;
  justify-content: center;
}
.loading ._load {
  margin: 10px;
}
.loading p {
  font-size: 1.5em;
}

.cutting {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
.cutting p {
  font-size: 1.5em;
  margin-top: 50px;
}

.nofound {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
.nofound p {
  font-size: 1.5em;
}
.btn {
  width: 85px;
  height: 35px;
  border-radius: 5px;
  border-width: 0px;
  background-color: rgb(90, 193, 221);
  color: white;
}
.btn:hover {
  background-color: rgb(112, 206, 231);
}

.pdf-w {
  overflow-y: auto;
  -webkit-box-sizing: content-box;
  box-sizing: content-box;
}
.content {
  position: absolute;
  top: 0px;
  bottom: 0px;
  left: 0px;
  right: 0px;
}
.status_bar {
  height: 35px;
  width: 100%;
  background-color: rgba(43, 40, 40, 0.837);
  z-index: 10;
  position: absolute;
  bottom: 0px;
  left: 0px;
  opacity: 0.4;
  transition: 0.5s;
}
.status_bar span {
  font-size: 15px;
  color: white;
  margin: auto 0px;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
}
.status_bar .status_info {
  right: 20px;
  display: flex;
  flex-direction: row;
}
.status_bar:hover {
  opacity: 1;
}
</style>
