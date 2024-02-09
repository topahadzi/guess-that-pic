FROM golang:alpine AS builder
WORKDIR /build

COPY go.mod ./
COPY go.sum ./
RUN go get ./...

COPY ws-service/main.go ./
ADD ws-service/websocket ./ws-service/websocket
RUN go build -o ws-server

FROM alpine
COPY --from=builder /build/ws-server ./
ENTRYPOINT ["/ws-server"]
