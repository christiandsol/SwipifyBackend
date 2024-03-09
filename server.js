import axios from 'axios'
import express from 'express'
import cors from 'cors'
import * as authenticate from './controllers/authenticate.js'
const app = express()
app.use(cors());

app.get('/', (req, res) => {
  res.send('hello world')
})

async function getProfile(access_token) {
    const response = await axios.get('https://api.spotify.com/v1/me', {
        headers: {
            'Authorization': 'Bearer ' + access_token
        }
    });
    console.log('Profile: ', response.data);
    return response.data;
}

app.get('/login', authenticate.control_login_authorize);

app.get('/callback', authenticate.control_login_callback);

app.get('/new_playlist', authenticate.new_playlist);

app.get('/playlists', authenticate.playlists);

app.get('/tracks', authenticate.tracks);

app.get('/test', authenticate.test);

app.delete('/remove_tracks', authenticate.remove_tracks);


app.get('/auth/token', authenticate.get_token);
app.listen(8000, () => {
  console.log('server started')
})


