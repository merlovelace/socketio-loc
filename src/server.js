const { Server } = require('socket.io')


const express = require('express')
const app = express()

const cors = require('cors')
app.use(cors({ origin: '*' }))

const parser = require('body-parser')
app.use(parser.json({ limit: '500kb' }))
app.use(parser.urlencoded({ limit: '500kb', extended: true }))

app.get('/socket',() =>  {
    console.log('Connected to server.')
})


const server = app.listen(5041, () => {
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

    socket.on('joinRoom',  async (data) => {

        try{
            let roomId;
            const filteredData = rooms.filter(el => el.eventId === data.eventId)
            if (filteredData) {
                roomId = filteredData.roomId
            } else {
                roomId = Math.random().toString(36).substring(2, 7);
                rooms.push({eventId: data.eventId, roomId: roomId});
            }

            const roomExists = io.sockets.adapter.rooms.has(roomId);
            if (!roomExists) {
                io.emit('userJoinedRoom', {
                    roomId: roomId,
                    position: data.position,
                    totalConnectedUsers: [],
                });
            }

            socket.join(roomId);
            socket.roomId = roomId;

            const totalRoomUsers = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
            io.emit('userJoinedRoom', {
                userId: socket.id,
                position: data.position,
                totalConnectedUsers: totalRoomUsers
            });

            io.to(roomId).emit('userJoinedRoom', {
                userId: socket.id,
                totalConnectedUsers: totalRoomUsers
            });

            io.to(`${socket.id}`).emit('roomJoined', {
                status: 'OK',
            });
        }catch (e) {
            console.log(e)
            return e
        }
    });



    socket.on('updateLocation',  (data) => {
        io.emit('updateLocationResponse', data)
    })

    socket.on('disconnect',  async (data) => {
        console.log(`User disconnected: ${socket.id}`)
        try{
            const roomId = socket.roomId;
            if (roomId) {
                socket.leave(roomId);
            }

            const totalRoomUsers = Array.from(io.sockets.adapter.rooms.get(roomId) || [])
            if(totalRoomUsers.length === 0){
                io.in(roomId).socketsLeave(roomId)
            }

            io.emit('userDisconnectedRoom', {
                totalConnectedUsers: totalRoomUsers
            });
        }catch (e) {
            console.log(e)
            return e
        }
    })

})

