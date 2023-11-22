package main

import (
	"net/http"
	"path/filepath"
)

var (
	staticFileDir = "assets"
)

var simpleRouterMap = map[string]string{
	"/":             "index.html",
	"/index":        "index.html",
	"/registration": "registration.html",
	"/main":         "main.html",
	"/showWallet":   "showWallet.html",
}

func main() {
	// 设置静态文件服务
	http.Handle("/assets/", http.StripPrefix("/assets/", http.FileServer(http.Dir(staticFileDir))))

	// 设置路由处理函数
	for route, fileName := range simpleRouterMap {
		http.HandleFunc(route, simpleRouter(fileName))
	}

	// 启动Web服务器
	http.ListenAndServe(":80", nil)
}

func simpleRouter(fileName string) func(http.ResponseWriter, *http.Request) {
	return func(writer http.ResponseWriter, request *http.Request) {
		http.ServeFile(writer, request, filepath.Join(staticFileDir, fileName))
	}
}
