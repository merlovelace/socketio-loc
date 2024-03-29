const {Server} = require('socket.io')


const express = require('express')
const app = express()

const cors = require('cors')
app.use(cors({origin: '*'}))

const parser = require('body-parser')
app.use(parser.json({limit: '500kb'}))
app.use(parser.urlencoded({limit: '500kb', extended: true}))

app.get('/socket', () => {
    console.log('Connected to server.')
})


const server = app.listen(5042, () => {
    console.log(`Socketio Backend Running!`)
    console.log(`Ortam: ${process.env.NODE_ENV}`)
    console.log(`Sunucu Saati: ${new Date()}`)
})

const io = new Server(server, {
    cors: {
        origin: '*',
    },
})

const rooms = []
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`)

    socket.on('joinRoom', async (data) => {
        try {
            let roomId;
            const filteredData = rooms.find(el => el.eventId === data.eventId);
            if (filteredData) {
                roomId = filteredData.roomId;
            } else {
                roomId = Math.random().toString(36).substring(2, 7);
                rooms.push({eventId: data.eventId, roomId: roomId});
            }

            const roomExists = io.sockets.adapter.rooms.has(roomId);
            if (!roomExists) {
                io.to(`${socket.id}`).emit('roomJoined', {
                    status: 'ERROR'
                })
            }

            socket.join(roomId);
            socket.roomId = roomId;

            const totalRoomUsers = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
            io.to(roomId).emit('userJoinedRoom', {
                totalConnectedUsers: totalRoomUsers
            });

            io.to(`${socket.id}`).emit('roomJoined', {
                status: 'OK',
            });
        } catch (e) {
            console.log(e)
            return e
        }
    });


    socket.on('updateLocation', (data) => {
        io.emit('updateLocationResponse', data)
    })

    socket.on('disconnectRoom', async (data) => {
        console.log(`User disconnected: ${socket.id}`)
        try {
            const roomId = socket.roomId;
            if (roomId) {
                socket.leave(roomId);
            }

            const totalRoomUsers = Array.from(io.sockets.adapter.rooms.get(roomId) || [])
            if (totalRoomUsers.length === 0) {
                io.sockets.adapter.rooms.delete(roomId)
            }

            io.to(roomId).emit('userLeftRoom', {
                userId: socket.id,
                totalConnectedUsers: Array.from(io.sockets.adapter.rooms.get(roomId) || [])
            })
        } catch (e) {
            console.log(e)
            return e
        }
    })

})

