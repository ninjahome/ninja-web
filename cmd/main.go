package main

import (
	"html/template"
	"net/http"
	"path/filepath"
)

var templates map[string]*template.Template

// LoginPageData 包含登录页面的数据结构
type LoginPageData struct {
	// 在这里定义需要在登录页面中使用的数据字段
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

// indexHandler 处理首页的请求
func indexHandler(w http.ResponseWriter, r *http.Request) {
	// 获取模板的名称（不带路径和扩展名）
	templateName := filepath.Base("assets/index.html")

	// 渲染HTML模板
	data := LoginPageData{}
	renderTemplate(w, templateName, data)
}

// RegistrationPageData 包含注册页面的数据结构
type RegistrationPageData struct {
	// 在这里定义需要在注册页面中使用的数据字段
}

// registrationHandler 处理注册页面的请求
func registrationHandler(w http.ResponseWriter, r *http.Request) {
	// 获取模板的名称（不带路径和扩展名）
	templateName := filepath.Base("assets/registration.html")

	// 渲染HTML模板
	data := RegistrationPageData{}
	renderTemplate(w, templateName, data)
}

// mainChatHandler
func mainChatHandler(w http.ResponseWriter, r *http.Request) {
	// 获取模板的名称（不带路径和扩展名）
	templateName := filepath.Base("assets/main.html")

	// 渲染HTML模板
	data := RegistrationPageData{}
	renderTemplate(w, templateName, data)
}
func main() {
	http.Handle("/assets/", http.StripPrefix("/assets/", http.FileServer(http.Dir("assets"))))
	// 设置路由处理函数
	http.HandleFunc("/", indexHandler)
	http.HandleFunc("/index", indexHandler)
	http.HandleFunc("/registration", registrationHandler)
	http.HandleFunc("/main", mainChatHandler)

	// 启动Web服务器
	http.ListenAndServe(":8080", nil)
}
