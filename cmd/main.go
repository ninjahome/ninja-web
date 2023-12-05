package main

import (
	"encoding/json"
	"net/http"
	"path/filepath"
	"time"
)

var (
	staticFileDir = "assets"
	shouldReload  = true // 控制变量，用于决定是否重新加载文件
)

var simpleRouterMap = map[string]string{
	"/":             "index.html",
	"/index":        "index.html",
	"/registration": "registration.html",
	"/main":         "main.html",
	"/showWallet":   "showWallet.html",
}

type ApiEthBalanceData struct {
	Address string `json:"address"`
	Eth     int64  `json:"eth"`
	Usdt    int64  `json:"usdt"`
}

func handleBalanceRequest(w http.ResponseWriter, r *http.Request) {
	accountID := r.URL.Query().Get("accountID")

	balance := &ApiEthBalanceData{
		Address: accountID,
		Eth:     0,
		Usdt:    0,
	}
	bts, _ := json.Marshal(balance)
	_, _ = w.Write(bts)
}

func main() {
	http.Handle("/assets/", http.StripPrefix("/assets/", http.FileServer(http.Dir(staticFileDir))))

	for route, fileName := range simpleRouterMap {
		http.HandleFunc(route, simpleRouter(fileName))
	}
	http.HandleFunc("/balance", handleBalanceRequest)
	panic(http.ListenAndServe(":80", nil))
}

func simpleRouter(fileName string) func(http.ResponseWriter, *http.Request) {
	return func(writer http.ResponseWriter, request *http.Request) {
		// 设置允许的跨域域名
		writer.Header().Set("Access-Control-Allow-Origin", "*")
		writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")

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
			writer.Header().Set("Cache-Control", "public, max-age=31536000") // 缓存一年
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
}
