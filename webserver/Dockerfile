FROM golang:alpine AS builder
WORKDIR /build
COPY go.mod ./
COPY go.sum ./
RUN go get ./...

COPY webserver/main.go ./
RUN go build -o webserver

FROM alpine
COPY --from=builder /build/webserver ./
ADD webserver/static ./static
ENTRYPOINT ["/webserver"]
