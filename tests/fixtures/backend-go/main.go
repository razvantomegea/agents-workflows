package main

import (
	"context"
	"fmt"
	"net/http"
)

func run(ctx context.Context) error {
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "ok")
	})
	return http.ListenAndServe(":8080", nil)
}

func main() {
	if err := run(context.Background()); err != nil {
		panic(err)
	}
}
