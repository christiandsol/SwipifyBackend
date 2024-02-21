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
        await remove_track_from_playlist();
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
        res.send(' ' + PLAYLIST_DATA.map(({ id, name, tracks, snapshot_id }) => ('<br/>id: ' + id + '  ||   num tracks:' + tracks.total + '  ||   name: ' + name + '  ||   snapshot_id: ' + snapshot_id )));
    }
    catch{
        res.send('no playlists?')
    }
}

export const tracks_page = async (req, res) => {

    try{
        let playlist_id = PLAYLIST_DATA[0].id;
        let tracks = await get_tracks_from_playlist(playlist_id);

        res.send('first playlist data:' + tracks.map(({track}) => '<br/>name is: ' + track.name + '     ||||||album is: ' + track.album.name + '     ||||||track_id is: ' + track.id));
    } catch {
        res.send('no playlists?')
    }
}

async function get_playlists() {
    //GETS THE MAX NUMBER OF PLAYLISTS WHICH IS 50. IF WE WANT TO GET ALL THIS MUST BE UPDATED. 
    let playlists = [];
    let queryString = 'https://api.spotify.com/v1/me/playlists';

    while (queryString){
        const response = await axios.get(queryString, {
            params: {
                'limit': 50,
                'offset': 0
            },
            headers: { 
                'Authorization': 'Bearer ' + ACCESS_TOKEN
        }});

        playlists = playlists.concat(response.data.items);
        queryString = response.data.next;
    }

    const user_owned_playlists = playlists.map((playlist) => {
        return playlist.owner.id == USER_ID ? playlist : null;
    });

    PLAYLIST_DATA = user_owned_playlists.filter(playlist => playlist);  
    return user_owned_playlists.length;
}

async function get_tracks_from_playlist(playlist_id){

    let tracks = [];
    let queryString = 'https://api.spotify.com/v1/playlists/' + playlist_id + '/tracks';

    while(queryString){
        const response = await axios.get(queryString, {
            params: {
                'market': 'US',
            },
            headers: {
                'Authorization': 'Bearer ' + ACCESS_TOKEN
            }
        });

        tracks = tracks.concat(response.data.items);
        queryString = response.data.next;
    }

    return tracks;
}

async function remove_track_from_playlist(playlist_id, trackids_to_remove){

    trackids_to_remove = ['2FDTHlrBguDzQkp7PVj16Q', '0GAyuCo975IHGxxiLKDufB'];
    playlist_id = '60uTaRX0ZDG5tSW3PCYBVL';

    let tracks_to_remove = trackids_to_remove.map((track_id) => ({"uri" : "spotify:track:" + track_id}));


    const playlist = PLAYLIST_DATA.find(obj => obj.id === playlist_id);

    let snapshot_id = playlist.snapshot_id;

    const response = await axios.delete('https://api.spotify.com/v1/playlists/' + playlist_id + '/tracks', {
        headers: {
            'Authorization': 'Bearer ' + ACCESS_TOKEN,
            'Content-Type': 'application/json'
        }, data: {
            'tracks': tracks_to_remove,
            'snapshot_id': snapshot_id
    }});

    console.log(response);

    await get_playlists();  //call get playlists again to update playlist data
    
}