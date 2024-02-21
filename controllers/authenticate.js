import querystring from 'querystring';
import axios from 'axios'
import dotenv from 'dotenv'
dotenv.config()

//initialization
const REDIRECT_URI = process.env.REDIRECT_URI; 
const CLIENT_SECRET = process.env.CLIENT_SECRET;  
const BASE_URL = process.env.BASE_URL; 
const AUTH_URL = process.env.AUTH_URL; 
const CLIENT_ID = process.env.CLIENT_ID; 
let ACCESS_TOKEN = process.env.ACCESS_TOKEN;
let REFRESH_TOKEN = process.env.REFRESH_TOKEN;
let USER_ID = process.env.USER_ID;
let PLAYLIST_DATA;

export const control_login_authorize = function(req, res) {
  const state = '798873302492668522416472228';
  var scope = 'user-read-private user-read-email streaming playlist-modify-private playlist-modify-public playlist-read-private';
  var redirectUrl = 'https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: CLIENT_ID,
      scope: scope,
      redirect_uri: REDIRECT_URI,
      state: state
    });
    console.log(CLIENT_ID);
    console.log(REDIRECT_URI);
    console.log(redirectUrl);
    res.redirect(redirectUrl);
};


export const control_login_callback = async function(req, res) {
    const code = req.query.code || null;
    const state = req.query.state || null;
    const storedState = req.query.state || null;
     const error = req.query.error || null;
    
    if (error) {
        console.log('Error: ', error);
        res.send('There was an error during the authentication');
    } else {
        // console.log('Code: ', code);
        const response = await axios.post('https://accounts.spotify.com/api/token', querystring.stringify({
            code: code,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code'
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + (new Buffer(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'))
            }
        });
        ACCESS_TOKEN = response.data.access_token;
        REFRESH_TOKEN= response.data.refresh_token;
        const profile = await getProfile(ACCESS_TOKEN);
        USER_ID= profile.id;
        await get_playlists();
        res.redirect('localhost:3000/get_playlists');
    }
};

export async function getProfile(access_token) {
    const response = await axios.get('https://api.spotify.com/v1/me', {
        headers: {
            'Authorization': 'Bearer ' + access_token
        }
    });
    console.log('Profile: ', response.data);
    return response.data;
}

export const obtain_tokens = async (req, res) => {
    const code = req.query.code || null;
    const state = req.query.state || null;
    const storedState = req.query.state || null;
     const error = req.query.error || null;
    
    if (error) {
        console.log('Error: ', error);
        res.send('There was an error during the authentication');
    } else {
        console.log('Code: ', code);
        const response = await axios.post('https://accounts.spotify.com/api/token', querystring.stringify({
        code: code,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
        }), {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + (new Buffer(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'))
        }
        });
        console.log('Response: ', response.data);
        ACCESS_TOKEN= response.data.access_token;
        console.log('Access token: ', ACCESS_TOKEN);
        REFRESH_TOKEN= response.data.refresh_token;
        const profile = await getProfile(ACCESS_TOKEN);
        USER_ID= profile.id;
        res.redirect('localhost:3000');
    }
}

export const get_token = async (req,res) => {
    console.log('Access token: ', ACCESS_TOKEN);
    res.json({
        access_token: ACCESS_TOKEN
    });
}

export const create_playlist= async (req, res) => {
    const response = await axios.post(`https://api.spotify.com/v1/users/${USER_ID}/playlists`, {
        name: 'New Playlist',
        public: false
    }, {
        headers: {
        'Authorization': 'Bearer ' + ACCESS_TOKEN,
        'Content-Type': 'application/json'
        }
    });
    console.log('Response: ', response.data);
    res.send('New playlist created');
} 

export const get_user_playlists = async (req, res) => {
    console.log('Playlists amount displayed, total: ', PLAYLIST_DATA.length);

    try{
        res.send(' ' + PLAYLIST_DATA.map(({ id, name, tracks }) => ('<br/>id: ' + id + '  ||   num tracks:' + tracks.total + '  ||   name: ' + name )));
    }
    catch{
        res.send('no playlists?')
    }
}

export const tracks_page = async (req, res) => {

    try{
        let playlist_id = PLAYLIST_DATA[0].id;
        let tracks = await get_tracks_from_playlist(playlist_id);

        res.send('first playlist data:' + tracks.data.items.map(({track}) => '<br/>name is: ' + track.name + '     ||||||album is: ' + track.album.name));
    } catch {
        res.send('no playlists?')
    }
}

async function get_playlists() {
    //GETS THE MAX NUMBER OF PLAYLISTS WHICH IS 50. IF WE WANT TO GET ALL THIS MUST BE UPDATED. 
    let playlists = [];
    let responseURL = 'https://api.spotify.com/v1/me/playlists';

    while (responseURL){
        const response = await axios.get(responseURL, {
            params: {
                'limit': 50,
                'offset': 0
            },
            headers: { 
                'Authorization': 'Bearer ' + ACCESS_TOKEN
        }});

        playlists = playlists.concat(response.data.items);
        responseURL = response.data.next;
    }

    const user_owned_playlists = playlists.map((playlist) => {
        return playlist.owner.id == USER_ID ? playlist : null;
    });

    PLAYLIST_DATA = user_owned_playlists.filter(playlist => playlist);  
    return user_owned_playlists.length;
}

async function get_tracks_from_playlist(playlist_id){

    const response = await axios.get('https://api.spotify.com/v1/playlists/' + playlist_id + '/tracks', {
        params: {
            'market': 'US',
            'fields': 'total,items(track(album(name), name))'
        },
        headers: {
            'Authorization': 'Bearer ' + ACCESS_TOKEN
        }
    });

    return response;
}
