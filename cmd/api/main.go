package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io/ioutil"
	"net/http"
)

const apiKey = "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"

func main() {
	// 解析命令行参数
	var question string
	flag.StringVar(&question, "question", "", "The question to ask GPT-3")
	flag.Parse()

	// 检查是否提供了问题
	if question == "" {
		fmt.Println("Please provide a question using the -question flag.")
		return
	}

	// 设置 GPT-3 API 地址
	apiURL := "https://api.openai.com/v1/engines/text-davinci-002/completions"

	// 准备请求数据
	data := map[string]interface{}{
		"prompt":      question,
		"max_tokens":  200, // 调整根据你的需要
		"temperature": 0.7,
	}

	// 将数据转换为 JSON 格式
	payload, err := json.Marshal(data)
	if err != nil {
		fmt.Println("Error encoding JSON:", err)
		return
	}

	// 创建 HTTP 请求
	request, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(payload))
	if err != nil {
		fmt.Println("Error creating request:", err)
		return
	}

	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Authorization", "Bearer "+apiKey)

	// 发送请求并获取响应
	client := &http.Client{}
	response, err := client.Do(request)
	if err != nil {
		fmt.Println("Error sending request:", err)
		return
	}
	defer response.Body.Close()

	// 读取响应体
	body, err := ioutil.ReadAll(response.Body)
	if err != nil {
		fmt.Println("Error reading response body:", err)
		return
	}

	// 解析 JSON 响应
	var responseData map[string]interface{}
	err = json.Unmarshal(body, &responseData)
	if err != nil {
		fmt.Println("Error decoding JSON:", err)
		return
	}

	// 输出生成的文本
	generatedText, ok := responseData["choices"].([]interface{})[0].(map[string]interface{})["text"].(string)
	if !ok {
		fmt.Println("Error extracting generated text from response.")
		return
	}

	fmt.Println("Generated Text:", generatedText)
}
