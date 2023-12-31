package main

import (
	"flag"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"
	"time"
)

var (
	staticFileDir = "assets"
	shouldReload  = true // 控制变量，用于决定是否重新加载文件//TODO：：
	Version       string
	Commit        string
	BuildTime     string
)

var simpleRouterMap = map[string]string{
	"/":             "index.html",
	"/index":        "index.html",
	"/registration": "registration.html",
	"/main":         "main.html",
	"/showWallet":   "showWallet.html",
}

func main() {
	useHttps := flag.Bool("server", false, "启动 HTTPS 服务器")
	certFile := flag.String("certfile", "", "SSL 证书文件路径")
	keyFile := flag.String("keyfile", "", "SSL 私钥文件路径")
	flag.Parse()

	http.Handle("/assets/", http.StripPrefix("/assets/", http.HandlerFunc(assetsRouter)))
	for route, fileName := range simpleRouterMap {
		http.HandleFunc(route, simpleRouter(fileName))
	}

	if *useHttps {
		if *certFile == "" || *keyFile == "" {
			panic("HTTPS 服务器需要指定证书文件和私钥文件")
		}
		fmt.Print("HTTPS模式")
		// 启动 HTTPS 服务器
		panic(http.ListenAndServeTLS(":443", *certFile, *keyFile, nil))
	} else {
		fmt.Print("简单模式")
		// 启动默认的 HTTP 服务器
		panic(http.ListenAndServe(":80", nil))
	}
}

func simpleRouter(fileName string) func(http.ResponseWriter, *http.Request) {
	return func(writer http.ResponseWriter, request *http.Request) {
		// 设置允许的跨域域名
		writer.Header().Set("Access-Control-Allow-Origin", "*")
		writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		serveStaticFile(writer, request, fileName)
	}
}

func assetsRouter(writer http.ResponseWriter, request *http.Request) {
	// 获取文件路径
	realUrlPath := request.URL.Path
	if strings.HasSuffix(realUrlPath, ".map") {
		realUrlPath = strings.TrimSuffix(realUrlPath, ".map")
	}

	serveStaticFile(writer, request, realUrlPath)
}

func serveStaticFile(writer http.ResponseWriter, request *http.Request, fileName string) {
	// 获取文件信息
	filePath := filepath.Join(staticFileDir, fileName)
	file, err := http.Dir(staticFileDir).Open(fileName)
	if err != nil {
		http.Error(writer, "File not found", http.StatusNotFound)
		return
	}
	defer file.Close()

	// 获取文件修改时间
	fileInfo, err := file.Stat()
	if err != nil {
		http.Error(writer, "Unable to get file information", http.StatusInternalServerError)
		return
	}
	modTime := fileInfo.ModTime()
	// 根据控制变量 shouldReload 设置 Cache-Control 头
	if shouldReload {
		writer.Header().Set("Cache-Control", "max-age=0, no-store, must-revalidate")
	} else {
		writer.Header().Set("Cache-Control", "public, max-age=1036000") // 缓存10天
	}

	// 设置 Last-Modified 头
	writer.Header().Set("Last-Modified", modTime.UTC().Format(http.TimeFormat))

	// 检查是否需要重新加载
	if t, err := time.Parse(http.TimeFormat, request.Header.Get("If-Modified-Since")); err == nil && modTime.Before(t.Add(1*time.Second)) {
		writer.WriteHeader(http.StatusNotModified)
		return
	}

	// 服务文件
	http.ServeFile(writer, request, filePath)
}
