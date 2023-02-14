# 应用设置菜单

## 编辑器

### 字体大小 fontSize

指定代码编辑器使用的字体大小。

NUMBER `15`

### 显示文件大小 showFileSize

在编辑器状态栏中显示文件大小。

SELECT TEXT `source:仅限源代码` + `off:关闭` `all:源代码和预览文件`

### 预览视图最大宽度 previewMaxWidth

指定预览视图的最大宽度。

NUMBER `1000`

### 预览视图贴靠位置 previewAlign

当窗口宽度超出预览视图最大宽度时，预览视图贴靠的方位。  
居中显得较为自然，但靠左更有利于提高工作效率。

SELECT TEXT `center:居中` + `left:靠左`

### 刷新预览的时机 previewRefresh

选择何时刷新预览内容。  
如果在编辑时感到明显卡顿，或者频繁刷新的预览会分散你的注意力，可以尝试降低刷新预览的频率。  
无论选择何种选项，预览总是会在保存文件时立即刷新。

SELECT TEXT `delay500:编辑停止后 0.5s` + `realtime:实时 (不推荐)` `delay200:编辑停止后 0.2s` `delay1000:编辑停止后 1s` `delay3000:编辑停止后 3s` `delay10000:编辑停止后 10s` `save:仅在保存文件时`

### 首选显示模式 displayMode

选择打开文件时默认使用的显示模式。  
新建文件时将忽略此设置，始终使用“拆分”模式。

SELECT TEXT `split:拆分` + `preview:预览`

### 自动保存 autoSave

自动保存会每隔 45s 尝试保存一次你的文件，以避免应用或系统崩溃导致工作丢失。  
自动保存不会对从来没有被保存过的新建文档生效。

SELECT TEXT `off:关闭` + `overwrite:直接覆盖保存`

## 导出与打印

### 纸张大小 paperSize

生成 PDF 文件的纸张大小。

SELECT TEXT `A4` + `B5` `A5`

### 图片分辨率 imageResolution

生成 PNG 图像的宽度，以像素为单位。

NUMBER `800`

### 首选浏览器 browser

执行打开 HTML 与打印操作时使用的浏览器可执行文件路径。  
留空将选择系统默认的浏览器。

TEXT ` `

### 临时 HTML 文件存放位置 tempHtmlLocation

打印与导出 PDF/PNG 时，需要先导出临时的 HTML 文件。  
注意导出到临时文件夹的文件将始终不会被清理，但是会覆盖之前的所有临时文件。

SELECT `temp:临时文件夹` + `source:与源文件同一文件夹`

## 提示弹窗

### 欢迎 hintWelcome

初次启动软件时显示的内容。

### 降低预览刷新频率提示 hintDethrottleRefresh

当检测到软件比较卡顿时，提醒用户进入设置降低预览刷新频率。

### HTML 文件较大警告 hintLargeHtml

提醒用户导出的 HTML 文件可能很大，不要尝试用文本编辑器查看。

### 导出原理提示 hintExportEssence

提醒用户导出 PNG/PDF 需要预先导出 HTML 预览。

### 打印原理提示 hintPrintEssence

提醒用户打印由浏览器来完成，并且若排版异常，可以在设置中选择其他浏览器。

### 评价提示 hintRate

超过第 5 次打开文件时，提醒用户进行评价与赞助。
