import querystring from 'querystring';
import axios from 'axios'
import dotenv from 'dotenv'
dotenv.config()

//initialization
const REDIRECT_URI = process.env.REDIRECT_URI; 
const CLIENT_SECRET = process.env.CLIENT_SECRET;  
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
        res.redirect('http://localhost:3000');
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

export const new_playlist= async (req, res) => {
    // PROB NOT NEEDED

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

export const playlists = async (req, res) => {

    try{
        console.log('Playlists amount displayed, total: ', PLAYLIST_DATA.length);
        res.json(PLAYLIST_DATA)
    }
    catch{
        res.send('no playlists? or not logged in')
    }
}

export const tracks = async (req, res) => {

    try{
        let playlist_id = req.query.playlist_id;
        let tracks = await get_tracks_from_playlist(playlist_id);
        res.json(tracks);
    } catch {
        console.log('fail')
        res.send('no playlists? or not logged in')
    }
}

export const test = async (req, res) => {
    try{
        // let x = await get_tracks_and_artists_from_playlist('0A0X9EeB29iwpAd7Pat5Ae');
        let tracks = await get_tracks_from_playlist('0A0X9EeB29iwpAd7Pat5Ae');
        sort_tracks_by_artist(tracks, null);
        res.send('test complete');
    }catch (error){
        res.send(error);
        console.log(error);
    }
}

/*
BEGIN API ACCESS FUNCTIONS
*/


async function get_playlists() {
    // Returns a full list of playlist objects owned by the user, and sets global variable PLAYLIST_DATA.
    

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

    PLAYLIST_DATA =  playlists.filter((playlist) => playlist.owner.id == USER_ID);
    return PLAYLIST_DATA;
}

async function get_tracks_from_playlist(playlist_id){
    // Returns an array of all track objects for a playlist, containing all their data, from the playlist given. 
    // Intended to be called by get_tracks_and_artists_from_playlist.

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

async function get_tracks_and_artists_from_playlist(playlist_id){
    // Function to return an object with 
    // 1. a list of tracks (track id, name, artist id, and album name as a minimum) and 
    // 2. a list of object artists that has ids and name at a minimum
    // 3. This function is intended to be called from the front end to populate the swiping page with tracks, and show a list of the artists to sort by


    let tracks = await get_tracks_from_playlist(playlist_id);
    let artists = tracks.map(({track}) => track.artists);
    artists = [].concat(...artists);
    let artist_ids = artists.map((artist) => artist.id);

    let unique_artists = artists.filter((artist, index) => artist_ids.slice(0,index).includes(artist.id));

    // let unique_artist_ids = new Set();
    // artists.map((artist) => unique_artist_ids.add(artist.id));

    // let unique_artists = artists.filter((artist) => { let x = unique_artist_ids.has(artist.id);
    //     unique_artist_ids.add(artist.id);
    //     return x;
    // })
    

    // // console.log(artists);
    // console.log(unique_artist_ids);
    // console.log(artists.map((artist) => artist.name));
    console.log(unique_artists.map((artist) => artist.name));


}

async function remove_tracks_from_playlist(playlist_id, trackids_to_remove){
    // Takes in an array of track_ids, and the playlist_id the track is meant to be removed from. 
    // Should be called with a list of track_ids from the front end, once the user confirms removal of the tracks. 
    // EX:
    // trackids_to_remove = ['2FDTHlrBguDzQkp7PVj16Q', '0GAyuCo975IHGxxiLKDufB'];
    // playlist_id = '60uTaRX0ZDG5tSW3PCYBVL';

    let tracks_to_remove = trackids_to_remove.map((track_id) => ({"uri" : "spotify:track:" + track_id}));


    const playlist = PLAYLIST_DATA.find(obj => obj.id === playlist_id);

    const response = await axios.delete('https://api.spotify.com/v1/playlists/' + playlist_id + '/tracks', {
        headers: {
            'Authorization': 'Bearer ' + ACCESS_TOKEN,
            'Content-Type': 'application/json'
        }, data: {
            'tracks': tracks_to_remove,
            'snapshot_id': playlist.snapshot_id
    }});

    console.log(response);

    await get_playlists();  //call get playlists again to update playlist data
}

function sort_tracks_by_artist(tracks, artist_id){
    // Given an array of track objects, puts all songs with artist of artist_id at the beginning of the array.
    // Returns the reordered list of tracks. 

    
    //- for each track, make an object that has the track and each of the artist ids in an array
    //- sort tracks, if a has artist return 1 and if b has artist return -1, if they both do or neither does return 0. 
    let artist_ids_and_tracks = tracks.map((track) => track.artists.map((artist) => artist.id).concat(track));
    console.log(artist_ids_and_tracks);

}
