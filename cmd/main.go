package main

import (
	"html/template"
	"net/http"
	"path/filepath"
)

var templates map[string]*template.Template

var (
	simpleRouterMap = map[string]*RouterDataApi{
		"/":             &RouterDataApi{"assets/index.html", nil},
		"/index":        {"assets/index.html", nil},
		"/registration": {"assets/registration.html", nil},
		"/main":         {"assets/main.html", nil},
		"/showWallet":   {"assets/showWallet.html", nil},
	}
)

type RouterData func() any

type RouterDataApi struct {
	Path     string
	DataFunc RouterData
}

func init() {
	// 初始化模板map
	templates = make(map[string]*template.Template)

	// 一次性解析所有匹配模式的HTML文件
	templateFiles, err := filepath.Glob("assets/*.html")
	if err != nil {
		panic(err)
	}

	// 遍历HTML文件并解析模板
	for _, file := range templateFiles {
		templateName := filepath.Base(file)
		templates[templateName] = template.Must(template.ParseFiles(file))
	}
}

// renderTemplate 加载并渲染HTML模板
func renderTemplate(w http.ResponseWriter, templateName string, data interface{}) {
	// 获取模板
	tmpl, ok := templates[templateName]
	if !ok {
		http.Error(w, "Template not found", http.StatusInternalServerError)
		return
	}

	// 渲染HTML模板
	err := tmpl.Execute(w, data)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func simpleRouter(api *RouterDataApi) func(http.ResponseWriter, *http.Request) {
	return func(writer http.ResponseWriter, request *http.Request) {
		// 获取模板的名称（不带路径和扩展名）
		templateName := filepath.Base(api.Path)

		// 渲染HTML模板
		var data any
		if api.DataFunc != nil {
			data = api.DataFunc
		}
		renderTemplate(writer, templateName, data)
	}
}

func main() {
	http.Handle("/assets/", http.StripPrefix("/assets/", http.FileServer(http.Dir("assets"))))
	// 设置路由处理函数
	for route, api := range simpleRouterMap {
		http.HandleFunc(route, simpleRouter(api))

	}
	// 启动Web服务器
	http.ListenAndServe(":80", nil)
}
