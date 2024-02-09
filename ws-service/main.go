package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/hojoung97/draw-quiz/ws-service/websocket"
)

var hubs map[int]*websocket.Hub

func setupWS(roomID int) {
	hubs[roomID] = websocket.NewHub(roomID)
	go hubs[roomID].Start()
}

func handleWS(w http.ResponseWriter, r *http.Request) {
	log.Printf("Websocket Endpoint Hit: %s%s\n", r.Host, r.URL.Path)

	vars := mux.Vars(r)
	roomID, err := strconv.Atoi(vars["roomID"])
	if err != nil {
		log.Printf("Fail to convert the roomID to int (handleWS): %v\n", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	if _, ok := hubs[roomID]; !ok {
		setupWS(roomID)
	} else if len(hubs[roomID].Clients) >= 2 {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	// Upgrade the connection to a WebSocket connection
	conn, err := websocket.Upgrade(w, r)
	if err != nil {
		log.Printf("Fail to upgrade the connection (handleWS): %v\n", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	client := &websocket.Client{
		Name: vars["userName"],
		Conn: conn,
		Hub:  hubs[roomID],
	}

	hubs[roomID].Register <- client
	// listen indefinitely for new messages on our websocket conn
	client.Read()
}

func main() {
	port := fmt.Sprintf(":%s", os.Getenv("WEBSOCKET_PORT"))
	hubs = make(map[int]*websocket.Hub)

	websocketMux := mux.NewRouter()
	websocketMux.HandleFunc("/{roomID:[0-9]+}/{userName}", handleWS)

	log.Printf("Listening Websocket connections on localhost%s\n", port)
	log.Fatal(http.ListenAndServe(port, websocketMux))
}
