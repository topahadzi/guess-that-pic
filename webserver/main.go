package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"

	"github.com/gorilla/mux"
)

func handleRoom(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	_, err := strconv.Atoi(query.Get("roomID"))
	if err != nil {
		log.Printf("Fail to convert the roomID to int (handleRoom): %v\n", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// TODO: talk to room service
	http.ServeFile(w, r, "static/draw_app.html")
}

func main() {
	port := fmt.Sprintf(":%s", os.Getenv("WEBSERVER_PORT"))
	webServerMux := mux.NewRouter()

	webServerMux.HandleFunc("/room", handleRoom).Methods("GET")
	webServerMux.PathPrefix("/").Handler(http.FileServer(http.Dir("./static")))

	// TODO: Make port as a configurable parameter
	log.Printf("Draw App Web Server Listening on localhost%s\n", port)
	log.Fatal(http.ListenAndServe(port, webServerMux))
}
