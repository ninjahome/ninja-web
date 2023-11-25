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
	http.Handle("/assets/", http.StripPrefix("/assets/", http.FileServer(http.Dir(staticFileDir))))

	for route, fileName := range simpleRouterMap {
		http.HandleFunc(route, simpleRouter(fileName))
	}

	panic(http.ListenAndServe(":80", nil))
}

func simpleRouter(fileName string) func(http.ResponseWriter, *http.Request) {

	return func(writer http.ResponseWriter, request *http.Request) {
		// 设置允许的跨域域名
		writer.Header().Set("Access-Control-Allow-Origin", "*")
		writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		// 进行路由处理
		http.ServeFile(writer, request, filepath.Join(staticFileDir, fileName))
	}
}
