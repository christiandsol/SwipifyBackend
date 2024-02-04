import axios from 'axios'
import express from 'express'
import cors from 'cors'
import * as authenticate from './controllers/authenticate.js'
const app = express()
app.use(cors());
let access_token = null;
let refresh_token = null;
let user_id = null;
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

//add a new playlist
app.post('/new_playlist', authenticate.create_playlist);

app.listen(8000, () => {
  console.log('server started')
})


