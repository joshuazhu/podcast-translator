.PHONY: build clean deploy gomodgen

help:
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

functions := $(shell find src -name \*main.go | awk -F'/' '{print $$2}')

build: ## Build golang binaries
	@for function in $(functions) ; do \
		env GOARCH=amd64 GOOS=linux go build -ldflags="-s -w" -o bin/$$function src/$$function/main.go ; \
	done

clean:
	rm -rf ./bin ./vendor go.sum

deploy: clean build
	sls deploy --verbose

gomodgen:
	chmod u+x gomod.sh
	./gomod.sh