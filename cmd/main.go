package main

import (
	"encoding/json"
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
		// 进行路由处理
		http.ServeFile(writer, request, filepath.Join(staticFileDir, fileName))
	}
}
