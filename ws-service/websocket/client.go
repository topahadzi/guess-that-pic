package websocket

import (
	"log"
	"strings"

	"github.com/gorilla/websocket"
)

type Client struct {
	ID   string
	Name string
	Conn *websocket.Conn
	Hub  *Hub
}

type Message struct {
	Type int    `json:"type"`
	Body string `json:"body"`
}

func (c *Client) Read() {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()

	for {
		messageType, p, err := c.Conn.ReadMessage()
		if err != nil {
			log.Printf("Fail to read client %s's message: %v\n", c.ID, err)
			return
		}

		message := Message{Type: messageType, Body: string(p)}
		if messageType == 1 {
			if strings.HasPrefix(message.Body, "drawing") {
				s := strings.Split(message.Body, ";")
				c.Hub.Object = s[len(s)-1]
				message.Body = "drawing"

			} else if strings.HasPrefix(message.Body, "option") {
				c.Hub.Options = message.Body[len("option"):]
				message.Body = "saving"

			} else if message.Body == "done" {
				message.Body += c.Hub.Options

			} else if strings.HasPrefix(message.Body, "answer") {
				s := strings.Split(message.Body, ";")

				if c.Hub.Object == s[len(s)-1] {
					c.Conn.WriteJSON(Message{Type: 1, Body: "correct0"})
					message.Body = "correct1"

				} else {
					c.Conn.WriteJSON(Message{Type: 1, Body: "wrong0"})
					message.Body = "wrong1"
				}
			}
		}

		for client := range c.Hub.Clients {
			if c == client {
				continue
			}

			if err := client.Conn.WriteJSON(message); err != nil {
				log.Printf("Fail in hub %d broadcast to user %s: %v\n", c.Hub.RoomID, client.ID, err)
			}
		}
	}
}
