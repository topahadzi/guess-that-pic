package websocket

import (
	"fmt"
	"log"
)

type Hub struct {
	RoomID     int
	Clients    map[*Client]bool
	Broadcast  chan Message
	Register   chan *Client
	Unregister chan *Client
	Object     string
	Options    string
}

func NewHub(roomID int) *Hub {
	return &Hub{
		RoomID:     roomID,
		Clients:    make(map[*Client]bool),
		Broadcast:  make(chan Message),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
	}
}

func (hub *Hub) Start() {
	defer func() {
		close(hub.Broadcast)
		close(hub.Register)
		close(hub.Unregister)
	}()

	for {
		select {
		case client := <-hub.Register:
			log.Printf("New Client %s joined room %d (size=%d)\n", client.Name, hub.RoomID, len(hub.Clients))
			for c := range hub.Clients {
				err := c.Conn.WriteJSON(Message{Type: 1, Body: fmt.Sprintf("New User %s Joined", client.Name)})
				if err != nil {
					log.Printf("Fail in hub %d WriteJSON to user %s: %v\n", c.Hub.RoomID, c.ID, err)
				}

				err = c.Conn.WriteJSON(Message{Type: 1, Body: "choose"})
				if err != nil {
					log.Printf("Fail in hub %d WriteJSON to user %s: %v\n", c.Hub.RoomID, c.ID, err)
				}
			}
			hub.Clients[client] = true

		case client := <-hub.Unregister:
			log.Printf("New Client %s left room %d (size=%d)\n", client.ID, hub.RoomID, len(hub.Clients))
			delete(hub.Clients, client)
			for c := range hub.Clients {
				err := c.Conn.WriteJSON(Message{Type: 1, Body: fmt.Sprintf("User %s Disconnected", client.ID)})
				if err != nil {
					log.Printf("Fail in hub %d WriteJSON to user %s: %v\n", c.Hub.RoomID, c.ID, err)
				}
			}
		}
	}
}
