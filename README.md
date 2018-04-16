# pdf-viewer

> 多文件合并vue pdf组件

# Usage

- npm i -save pdf-viewer-muti
```javascript
import pdfshower from "pdf-viewer-muti";

components: {
    pdfshower
  }
  ```

# Events

- loading
    - true/false 是否在加载

- pagechange
    - currentpage 当前页码

- onProgress
    - progressdata 当前下载数据量

- exception
    - exception 异常信息

# Attributes

- src
    - Array 所有文件按顺序排列的url地址

- IDSrc
    - 传入pdf file id

- baseUrl
    - pdf平台请求基础地址 exp:http://xxxx/api

- startnum
    - 起始页

- showloading
    - true/false 是否使用loading记载动画

- size
    - :size="{width:'800px',height:'1300px'}"定义预览界面的宽高
# Method

- jumpnum
    - num 传入需要前往的页码可以跳转到相应的页码


# Slot

- loading-view

    - 加载中的view 通过slot传入

- cutting-view

    - 切割中的view 通过slot传入

- nofound-view

    - 失败的view 通过slot传入